package com.tuempresa.cmms.service;

import com.tuempresa.cmms.model.entity.User;
import dev.samstevens.totp.code.CodeVerifier;
import dev.samstevens.totp.code.DefaultCodeGenerator;
import dev.samstevens.totp.code.DefaultCodeVerifier;
import dev.samstevens.totp.qr.QrData;
import dev.samstevens.totp.secret.DefaultSecretGenerator;
import dev.samstevens.totp.secret.SecretGenerator;
import dev.samstevens.totp.time.SystemTimeProvider;
import org.springframework.stereotype.Service;

/**
 * MFA con TOTP (RFC 6238) -- compatible con Google Authenticator, Authy,
 * 1Password, etc. Opcional por usuario, se activa desde Ajustes. No se
 * genera la imagen del QR en el backend (evita sumar una dependencia de
 * generacion de imagenes); el frontend arma el QR a partir de la URI
 * "otpauth://" que devuelve /auth/mfa/setup, o el usuario carga el
 * secreto a mano en su app de autenticacion.
 */
@Service
public class MfaService {

    private final SecretGenerator secretGenerator = new DefaultSecretGenerator();
    private final CodeVerifier codeVerifier = new DefaultCodeVerifier(new DefaultCodeGenerator(), new SystemTimeProvider());

    public String generateSecret() {
        return secretGenerator.generate();
    }

    public String buildOtpAuthUri(User user, String secret) {
        QrData data = new QrData.Builder()
                .label(user.getEmail())
                .secret(secret)
                .issuer("Expalsa Activa")
                .algorithm(dev.samstevens.totp.code.HashingAlgorithm.SHA1)
                .digits(6)
                .period(30)
                .build();
        return data.getUri();
    }

    public boolean verifyCode(String secret, String code) {
        return code != null && codeVerifier.isValidCode(secret, code);
    }
}
