package com.example.usermanagement.controller;

import com.example.usermanagement.dto.ForgotPasswordRequest;
import com.example.usermanagement.dto.LoginRequest;
import com.example.usermanagement.dto.RegisterRequest;
import com.example.usermanagement.dto.ResetPasswordRequest;
import com.example.usermanagement.dto.UserProfileResponse;
import com.example.usermanagement.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class AuthController {

    private final AuthService authService;
    private final com.example.usermanagement.service.EmailService emailService;

    public AuthController(AuthService authService, com.example.usermanagement.service.EmailService emailService) {
        this.authService = authService;
        this.emailService = emailService;
    }

    @PostMapping("/auth/register")
    public ResponseEntity<Map<String, Object>> registerUser(@Valid @RequestBody RegisterRequest request) {
        UserProfileResponse registeredUser = authService.registerUser(request);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Account registered successfully! Please log in with your credentials.");
        response.put("user", registeredUser);

        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PostMapping("/auth/login")
    public ResponseEntity<Map<String, Object>> loginUser(@Valid @RequestBody LoginRequest request,
                                                         HttpServletRequest httpRequest) {
        UserProfileResponse userProfile = authService.authenticateUser(request, httpRequest);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Login successful! Welcome back.");
        response.put("user", userProfile);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/auth/forgot-password")
    public ResponseEntity<Map<String, Object>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        String resetLink = authService.processForgotPassword(request);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);

        if (emailService.isConfigured()) {
            response.put("message", "If an account with that email exists, password reset instructions have been sent.");
        } else {
            response.put("message", "Reset instructions generated. Since SMTP is not configured in backend/.env, use the direct reset link below.");
            if (resetLink != null) {
                response.put("devResetLink", resetLink);
            }
        }

        return ResponseEntity.ok(response);
    }

    @PostMapping("/auth/reset-password")
    public ResponseEntity<Map<String, Object>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Password has been reset successfully! Please sign in with your new password.");

        return ResponseEntity.ok(response);
    }

    @GetMapping("/auth/csrf")
    public ResponseEntity<Map<String, String>> getCsrfToken(HttpServletRequest request) {
        CsrfToken csrfToken = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
        Map<String, String> response = new HashMap<>();
        if (csrfToken != null) {
            response.put("token", csrfToken.getToken());
            response.put("headerName", csrfToken.getHeaderName());
            response.put("parameterName", csrfToken.getParameterName());
        }
        return ResponseEntity.ok(response);
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> healthCheck() {
        Map<String, String> health = new HashMap<>();
        health.put("status", "UP");
        health.put("service", "Spring Boot User Management API");
        health.put("database", "MySQL (user_management_db)");
        return ResponseEntity.ok(health);
    }
}
