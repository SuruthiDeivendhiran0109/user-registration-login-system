package com.example.usermanagement.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
@Order(1)
public class DatabaseSchemaMigration implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DatabaseSchemaMigration.class);
    private final JdbcTemplate jdbcTemplate;

    public DatabaseSchemaMigration(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        try {
            // Check if legacy column 'name' exists on table 'users'
            List<Map<String, Object>> columns = jdbcTemplate.queryForList(
                "SELECT COLUMN_NAME, IS_NULLABLE FROM information_schema.COLUMNS " +
                "WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'name'"
            );

            if (!columns.isEmpty()) {
                log.info("Found legacy 'name' column in users table; making it nullable to permit registration inserts.");
                jdbcTemplate.execute("ALTER TABLE users MODIFY COLUMN name VARCHAR(255) NULL DEFAULT NULL");
                log.info("Successfully updated legacy 'name' column to nullable.");
            }

            // Check columns in password_reset_tokens
            List<Map<String, Object>> prtCols = jdbcTemplate.queryForList(
                "SELECT COLUMN_NAME FROM information_schema.COLUMNS " +
                "WHERE TABLE_NAME = 'password_reset_tokens'"
            );
            boolean hasToken = false;
            boolean hasTokenHash = false;
            for (Map<String, Object> col : prtCols) {
                String cName = String.valueOf(col.get("COLUMN_NAME"));
                if ("token".equalsIgnoreCase(cName)) hasToken = true;
                if ("token_hash".equalsIgnoreCase(cName)) hasTokenHash = true;
            }

            if (!prtCols.isEmpty()) {
                if (!hasToken) {
                    log.info("Adding 'token' column to password_reset_tokens.");
                    jdbcTemplate.execute("ALTER TABLE password_reset_tokens ADD COLUMN token VARCHAR(255) NULL DEFAULT NULL");
                }
                if (!hasTokenHash) {
                    log.info("Adding 'token_hash' column to password_reset_tokens.");
                    jdbcTemplate.execute("ALTER TABLE password_reset_tokens ADD COLUMN token_hash VARCHAR(64) NULL DEFAULT NULL");
                }
            }
        } catch (Exception e) {
            log.warn("Notice during schema migration check: {}", e.getMessage());
        }
    }
}
