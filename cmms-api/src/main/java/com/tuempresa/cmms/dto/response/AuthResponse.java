package com.tuempresa.cmms.dto.response;

public record AuthResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        Boolean mfaRequired,
        String mfaChallengeToken
) {
    public AuthResponse(String accessToken, String refreshToken) {
        this(accessToken, refreshToken, "Bearer", false, null);
    }

    public static AuthResponse mfaChallenge(String challengeToken) {
        return new AuthResponse(null, null, null, true, challengeToken);
    }
}
