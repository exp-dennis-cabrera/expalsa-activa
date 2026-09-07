package com.tuempresa.cmms;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableAsync
@EnableScheduling
public class CmmsApplication {

    public static void main(String[] args) {
        SpringApplication.run(CmmsApplication.class, args);
    }
}
