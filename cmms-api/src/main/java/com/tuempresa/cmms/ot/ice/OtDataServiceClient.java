package com.tuempresa.cmms.ot.ice;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManagerFactory;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyStore;
import java.security.SecureRandom;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.time.Duration;
import java.time.Instant;
import java.util.regex.Pattern;

@Service
@Slf4j
public class OtDataServiceClient {

    private static final Pattern ASSET_KEY_PATTERN =
            Pattern.compile("[A-Za-z0-9._-]{1,128}");

    private static final Duration CONNECT_TIMEOUT =
            Duration.ofSeconds(5);

    private static final Duration REQUEST_TIMEOUT =
            Duration.ofSeconds(10);

    /*
     * Tope duro del cuerpo de respuesta.
     *
     * El dashboard OT real pesa unos pocos KB.
     * Un servicio comprometido o en falla no puede
     * forzarnos a materializar una respuesta enorme
     * en el heap del backend.
     */
    private static final int MAX_RESPONSE_BYTES =
            1024 * 1024;

    private final ObjectMapper objectMapper;

    private final Object tokenLock = new Object();

    private volatile CachedToken cachedToken;

    private HttpClient httpClient;

    @Value("${OT_DATA_SERVICE_ENABLED:false}")
    private boolean enabled;

    @Value("${OT_DATA_SERVICE_BASE_URL:https://ot-api.expalsa.com}")
    private String dataServiceBaseUrl;

    @Value("${OT_AUTH_TOKEN_URL:https://auth.expalsa.com/realms/expalsa-ot/protocol/openid-connect/token}")
    private String tokenUrl;

    @Value("${OT_M2M_CLIENT_ID:}")
    private String clientId;

    @Value("${OT_M2M_CLIENT_SECRET_FILE:}")
    private String clientSecretFile;

    @Value("${OT_M2M_SCOPE:ot.ice.read}")
    private String scope;

    @Value("${OT_CA_FILE:}")
    private String caFile;

    public OtDataServiceClient(
            final ObjectMapper objectMapper
    ) {
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    void init() {
        if (!enabled) {
            log.info("OT Data Service client disabled");
            return;
        }

        requireConfigured(
                "OT_DATA_SERVICE_BASE_URL",
                dataServiceBaseUrl
        );
        requireConfigured(
                "OT_AUTH_TOKEN_URL",
                tokenUrl
        );
        requireConfigured(
                "OT_M2M_CLIENT_ID",
                clientId
        );
        requireConfigured(
                "OT_M2M_CLIENT_SECRET_FILE",
                clientSecretFile
        );
        requireConfigured(
                "OT_CA_FILE",
                caFile
        );

        try {
            this.httpClient =
                    buildHttpClient(Path.of(caFile));

            log.info(
                    "OT Data Service client enabled baseUrl={} clientId={} scope={}",
                    dataServiceBaseUrl,
                    clientId,
                    scope
            );

        } catch (Exception e) {
            throw new IllegalStateException(
                    "No se pudo inicializar TLS para OT Data Service",
                    e
            );
        }
    }

    public JsonNode getIceDashboard(
            final String assetKey
    ) {

        if (!enabled) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "OT Data Service deshabilitado"
            );
        }

        validateAssetKey(assetKey);

        try {
            String token =
                    getAccessToken(false);

            TextResponse response =
                    sendDashboardRequest(
                            assetKey,
                            token
                    );

            /*
             * Si el token expiró antes de lo esperado,
             * invalidamos el cache y reintentamos UNA vez.
             */
            if (response.statusCode() == 401) {

                invalidateToken();

                token =
                        getAccessToken(true);

                response =
                        sendDashboardRequest(
                                assetKey,
                                token
                        );
            }

            if (response.statusCode() == 404) {
                throw new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Activo OT no encontrado"
                );
            }

            if (response.statusCode() != 200) {

                log.warn(
                        "OT Data Service respondió status={}",
                        response.statusCode()
                );

                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "OT Data Service no disponible"
                );
            }

            JsonNode payload =
                    objectMapper.readTree(
                            response.body()
                    );

            String returnedAssetKey =
                    payload.path("assetKey")
                            .asText("");

            if (!assetKey.equals(returnedAssetKey)) {

                log.error(
                        "OT Data Service asset mismatch requested={} returned={}",
                        assetKey,
                        returnedAssetKey
                );

                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Respuesta OT inválida"
                );
            }

            if (!payload.path("production")
                    .path("bagsToday")
                    .isNumber()) {

                log.error(
                        "OT Data Service payload incompleto asset={}",
                        assetKey
                );

                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Respuesta OT inválida"
                );
            }

            return payload;

        } catch (ResponseStatusException e) {
            throw e;

        } catch (InterruptedException e) {

            Thread.currentThread().interrupt();

            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Consulta OT interrumpida"
            );

        } catch (Exception e) {

            log.error(
                    "Error consultando OT Data Service: {}",
                    e.getClass().getSimpleName()
            );

            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "OT Data Service no disponible"
            );
        }
    }

    private TextResponse sendDashboardRequest(
            final String assetKey,
            final String accessToken
    ) throws Exception {

        String base =
                stripTrailingSlash(
                        dataServiceBaseUrl
                );

        String encodedAsset =
                URLEncoder.encode(
                        assetKey,
                        StandardCharsets.UTF_8
                ).replace("+", "%20");

        URI uri =
                URI.create(
                        base
                                + "/api/v1/ice/assets/"
                                + encodedAsset
                                + "/dashboard"
                );

        HttpRequest request =
                HttpRequest.newBuilder()
                        .uri(uri)
                        .timeout(REQUEST_TIMEOUT)
                        .header(
                                "Authorization",
                                "Bearer " + accessToken
                        )
                        .header(
                                "Accept",
                                "application/json"
                        )
                        .GET()
                        .build();

        return sendBounded(request);
    }

    /**
     * Envía la petición y materializa el cuerpo como texto
     * solo hasta {@link #MAX_RESPONSE_BYTES}.
     *
     * Se lee en streaming: si el servicio OT excede el tope
     * se aborta y se cierra la conexión, sin cargar el resto.
     */
    private TextResponse sendBounded(
            final HttpRequest request
    ) throws Exception {

        HttpResponse<InputStream> response =
                httpClient.send(
                        request,
                        HttpResponse.BodyHandlers.ofInputStream()
                );

        long declaredLength =
                response.headers()
                        .firstValueAsLong("Content-Length")
                        .orElse(-1L);

        try (InputStream body = response.body()) {

            if (declaredLength > MAX_RESPONSE_BYTES) {
                throw tooLarge(declaredLength);
            }

            return new TextResponse(
                    response.statusCode(),
                    readBounded(body)
            );
        }
    }

    private static String readBounded(
            final InputStream input
    ) throws Exception {

        ByteArrayOutputStream buffer =
                new ByteArrayOutputStream();

        byte[] chunk = new byte[8192];

        long total = 0;
        int read;

        while ((read = input.read(chunk)) != -1) {

            total += read;

            if (total > MAX_RESPONSE_BYTES) {
                throw tooLarge(total);
            }

            buffer.write(chunk, 0, read);
        }

        return buffer.toString(StandardCharsets.UTF_8);
    }

    private static ResponseStatusException tooLarge(
            final long bytes
    ) {

        log.error(
                "OT Data Service respuesta excede el limite bytes>={} max={}",
                bytes,
                MAX_RESPONSE_BYTES
        );

        return new ResponseStatusException(
                HttpStatus.BAD_GATEWAY,
                "Respuesta OT demasiado grande"
        );
    }

    private String getAccessToken(
            final boolean forceRefresh
    ) throws Exception {

        CachedToken current =
                cachedToken;

        long now =
                Instant.now().getEpochSecond();

        if (!forceRefresh
                && current != null
                && now < current.refreshAtEpochSecond()) {

            return current.accessToken();
        }

        synchronized (tokenLock) {

            current =
                    cachedToken;

            now =
                    Instant.now().getEpochSecond();

            if (!forceRefresh
                    && current != null
                    && now < current.refreshAtEpochSecond()) {

                return current.accessToken();
            }

            String secret =
                    readSecret(
                            Path.of(clientSecretFile)
                    );

            String form =
                    "grant_type=client_credentials"
                            + "&client_id="
                            + formEncode(clientId)
                            + "&client_secret="
                            + formEncode(secret)
                            + "&scope="
                            + formEncode(scope);

            HttpRequest request =
                    HttpRequest.newBuilder()
                            .uri(URI.create(tokenUrl))
                            .timeout(REQUEST_TIMEOUT)
                            .header(
                                    "Content-Type",
                                    "application/x-www-form-urlencoded"
                            )
                            .header(
                                    "Accept",
                                    "application/json"
                            )
                            .POST(
                                    HttpRequest.BodyPublishers
                                            .ofString(form)
                            )
                            .build();

            TextResponse response =
                    sendBounded(request);

            if (response.statusCode() != 200) {

                log.error(
                        "Keycloak client_credentials falló status={}",
                        response.statusCode()
                );

                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Autenticación OT no disponible"
                );
            }

            JsonNode tokenJson =
                    objectMapper.readTree(
                            response.body()
                    );

            String accessToken =
                    tokenJson.path("access_token")
                            .asText("");

            long expiresIn =
                    tokenJson.path("expires_in")
                            .asLong(0);

            if (accessToken.isBlank()
                    || expiresIn <= 0) {

                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Respuesta OAuth inválida"
                );
            }

            /*
             * Renovamos antes del vencimiento.
             *
             * Para un token de 300 s:
             * refresh aproximado a los 270 s.
             */
            long skew =
                    Math.min(
                            30,
                            Math.max(
                                    1,
                                    expiresIn / 5
                            )
                    );

            long refreshAt =
                    Instant.now()
                            .plusSeconds(
                                    Math.max(
                                            1,
                                            expiresIn - skew
                                    )
                            )
                            .getEpochSecond();

            cachedToken =
                    new CachedToken(
                            accessToken,
                            refreshAt
                    );

            return accessToken;
        }
    }

    private void invalidateToken() {
        synchronized (tokenLock) {
            cachedToken = null;
        }
    }

    private static HttpClient buildHttpClient(
            final Path rootCaPath
    ) throws Exception {

        if (!Files.isRegularFile(rootCaPath)) {
            throw new IllegalStateException(
                    "CA OT inexistente"
            );
        }

        CertificateFactory factory =
                CertificateFactory.getInstance(
                        "X.509"
                );

        X509Certificate rootCa;

        try (InputStream input =
                     Files.newInputStream(
                             rootCaPath
                     )) {

            rootCa =
                    (X509Certificate)
                            factory.generateCertificate(
                                    input
                            );
        }

        KeyStore trustStore =
                KeyStore.getInstance(
                        KeyStore.getDefaultType()
                );

        trustStore.load(
                null,
                null
        );

        trustStore.setCertificateEntry(
                "expalsa-ot-root",
                rootCa
        );

        TrustManagerFactory tmf =
                TrustManagerFactory.getInstance(
                        TrustManagerFactory
                                .getDefaultAlgorithm()
                );

        tmf.init(trustStore);

        SSLContext sslContext =
                SSLContext.getInstance(
                        "TLS"
                );

        sslContext.init(
                null,
                tmf.getTrustManagers(),
                new SecureRandom()
        );

        /*
         * No se desactiva hostname verification.
         * auth.expalsa.com y ot-api.expalsa.com
         * deben coincidir con el SAN del certificado.
         */
        return HttpClient.newBuilder()
                .connectTimeout(CONNECT_TIMEOUT)
                .followRedirects(
                        HttpClient.Redirect.NEVER
                )
                .sslContext(sslContext)
                .build();
    }

    private static String readSecret(
            final Path path
    ) throws Exception {

        if (!Files.isRegularFile(path)) {
            throw new IllegalStateException(
                    "Secret M2M inexistente"
            );
        }

        String secret =
                Files.readString(
                        path,
                        StandardCharsets.UTF_8
                ).trim();

        if (secret.isBlank()) {
            throw new IllegalStateException(
                    "Secret M2M vacío"
            );
        }

        return secret;
    }

    private static void validateAssetKey(
            final String assetKey
    ) {

        if (assetKey == null
                || !ASSET_KEY_PATTERN
                        .matcher(assetKey)
                        .matches()) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "assetKey inválido"
            );
        }
    }

    private static String formEncode(
            final String value
    ) {
        return URLEncoder.encode(
                value,
                StandardCharsets.UTF_8
        );
    }

    private static String stripTrailingSlash(
            final String value
    ) {
        return value.endsWith("/")
                ? value.substring(
                        0,
                        value.length() - 1
                )
                : value;
    }

    private static void requireConfigured(
            final String name,
            final String value
    ) {

        if (value == null
                || value.isBlank()) {

            throw new IllegalStateException(
                    name + " requerido"
            );
        }
    }

    private record CachedToken(
            String accessToken,
            long refreshAtEpochSecond
    ) {
    }

    /** Respuesta HTTP ya acotada a {@link #MAX_RESPONSE_BYTES}. */
    private record TextResponse(
            int statusCode,
            String body
    ) {
    }
}
