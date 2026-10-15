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
        } catch (Exception e) {
            log.warn("Notice during schema migration check: {}", e.getMessage());
        }
    }
}
