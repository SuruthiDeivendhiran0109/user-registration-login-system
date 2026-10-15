package com.example.usermanagement;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;

@SpringBootApplication
public class UserManagementApplication {

    private static final Logger log = LoggerFactory.getLogger(UserManagementApplication.class);

    public static void main(String[] args) {
        loadDotenv();
        SpringApplication.run(UserManagementApplication.class, args);
    }

    private static void loadDotenv() {
        File[] candidates = new File[] {
            new File(".env"),
            new File("backend/.env"),
            new File("../backend/.env"),
            new File("../.env")
        };

        for (File file : candidates) {
            if (file.exists() && file.isFile()) {
                log.info("Loading environment configuration from: {}", file.getAbsolutePath());
                try (BufferedReader reader = new BufferedReader(new FileReader(file))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        line = line.trim();
                        if (line.isEmpty() || line.startsWith("#")) continue;
                        int idx = line.indexOf('=');
                        if (idx > 0) {
                            String key = line.substring(0, idx).trim();
                            String val = line.substring(idx + 1).trim();
                            if ((val.startsWith("\"") && val.endsWith("\"")) ||
                                (val.startsWith("'") && val.endsWith("'"))) {
                                val = val.substring(1, val.length() - 1);
                            }
                            if (System.getProperty(key) == null && System.getenv(key) == null) {
                                System.setProperty(key, val);
                            }
                        }
                    }
                } catch (IOException e) {
                    log.warn("Could not read .env file at {}: {}", file.getPath(), e.getMessage());
                }
                break;
            }
        }
    }
}
