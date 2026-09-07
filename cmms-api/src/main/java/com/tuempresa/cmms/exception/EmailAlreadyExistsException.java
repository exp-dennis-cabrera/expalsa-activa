package com.tuempresa.cmms.exception;

public class EmailAlreadyExistsException extends RuntimeException {
    public EmailAlreadyExistsException(String email) {
        super("Ya existe una cuenta con el email: " + email);
    }
}
