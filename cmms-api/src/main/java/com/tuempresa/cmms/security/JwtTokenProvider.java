package com.tuempresa.cmms.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;

@Component
public class JwtTokenProvider {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.access-token-expiration}")
    private long accessTokenExpirationMs;

    @Value("${jwt.refresh-token-expiration}")
    private long refreshTokenExpirationMs;

    private SecretKey key() {
        return Keys.hmacShaKeyFor(secret.getBytes());
    }

    public String generateAccessToken(CmmsUserDetails user) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + accessTokenExpirationMs);

        return Jwts.builder()
                .subject(String.valueOf(user.getUserId()))
                .claim("organizationId", user.getOrganizationId())
                .claim("role", user.getRoleName())
                .claim("type", "access")
                .issuedAt(now)
                .expiration(expiry)
                .signWith(key(), SignatureAlgorithm.HS256)
                .compact();
    }

    public String generateRefreshToken(CmmsUserDetails user) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + refreshTokenExpirationMs);

        return Jwts.builder()
                .subject(String.valueOf(user.getUserId()))
                .claim("type", "refresh")
                .issuedAt(now)
                .expiration(expiry)
                .signWith(key(), SignatureAlgorithm.HS256)
                .compact();
    }

    /**
     * Token intermedio de corta duracion (5 min): se emite despues de
     * validar la contraseña, pero ANTES de confirmar el segundo factor
     * (TOTP). No sirve como access token real -- el filtro rechaza
     * cualquier token cuyo "type" no sea "access" (ver JwtAuthenticationFilter).
     */
    public String generateMfaChallengeToken(Long userId) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + 5 * 60 * 1000);

        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("type", "mfa_challenge")
                .issuedAt(now)
                .expiration(expiry)
                .signWith(key(), SignatureAlgorithm.HS256)
                .compact();
    }

    public String getTokenType(String token) {
        return parseClaims(token).get("type", String.class);
    }

    public Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(key())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean isValid(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public Long getUserId(String token) {
        return Long.valueOf(parseClaims(token).getSubject());
    }

    public Long getOrganizationId(String token) {
        return parseClaims(token).get("organizationId", Long.class);
    }
}
