package com.example.usermanagement.service;

import com.example.usermanagement.dto.ForgotPasswordRequest;
import com.example.usermanagement.dto.LoginRequest;
import com.example.usermanagement.dto.RegisterRequest;
import com.example.usermanagement.dto.ResetPasswordRequest;
import com.example.usermanagement.dto.UserProfileResponse;
import com.example.usermanagement.entity.PasswordResetToken;
import com.example.usermanagement.entity.User;
import com.example.usermanagement.exception.DuplicateEmailException;
import com.example.usermanagement.exception.ResourceNotFoundException;
import com.example.usermanagement.repository.PasswordResetTokenRepository;
import com.example.usermanagement.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Optional;
import java.util.regex.Pattern;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final EmailService emailService;

    @Value("${app.frontend.url:http://localhost:3000}")
    private String frontendUrl;

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final int RESET_TOKEN_EXPIRATION_MINUTES = 15;

    private static final Pattern UPPERCASE_PATTERN = Pattern.compile("[A-Z]");
    private static final Pattern LOWERCASE_PATTERN = Pattern.compile("[a-z]");
    private static final Pattern DIGIT_PATTERN = Pattern.compile("[0-9]");
    private static final Pattern SPECIAL_CHAR_PATTERN = Pattern.compile("[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>\\/?]");

    public AuthService(UserRepository userRepository,
                       PasswordResetTokenRepository tokenRepository,
                       PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager,
                       EmailService emailService) {
        this.userRepository = userRepository;
        this.tokenRepository = tokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.emailService = emailService;
    }

    @Transactional
    public UserProfileResponse registerUser(RegisterRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();

        // Verify password and confirm password match
        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new IllegalArgumentException("Passwords do not match.");
        }

        // Verify age requirement (at least 13 years old)
        if (request.getDateOfBirth() != null) {
            java.time.LocalDate today = java.time.LocalDate.now();
            java.time.Period period = java.time.Period.between(request.getDateOfBirth(), today);
            if (period.getYears() < 13) {
                throw new IllegalArgumentException("User must be at least 13 years old to register.");
            }
        }

        // Strict server-side password strength validation
        validatePasswordStrength(request.getPassword());

        // Check if email already registered in MySQL
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new DuplicateEmailException("An account with this email address already exists.");
        }

        // BCrypt password hashing
        String passwordHash = passwordEncoder.encode(request.getPassword());

        // Create persistent entity
        User user = new User(
            request.getFirstName().trim(),
            request.getLastName().trim(),
            request.getDateOfBirth(),
            request.getAddress().trim(),
            request.getPhoneNumber().trim(),
            normalizedEmail,
            passwordHash
        );

        User savedUser = userRepository.save(user);

        return new UserProfileResponse(savedUser);
    }

    public UserProfileResponse authenticateUser(LoginRequest request, HttpServletRequest httpRequest) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();

        // Authenticate credentials against Spring Security UserDetailsService & BCrypt
        Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(normalizedEmail, request.getPassword())
        );

        // Establish SecurityContext
        SecurityContext securityContext = SecurityContextHolder.createEmptyContext();
        securityContext.setAuthentication(authentication);
        SecurityContextHolder.setContext(securityContext);

        // Bind SecurityContext to HTTP Session (Session Fixation protected)
        HttpSession session = httpRequest.getSession(true);
        session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, securityContext);

        // Fetch fresh user profile from MySQL
        User user = userRepository.findByEmail(normalizedEmail)
            .orElseThrow(() -> new ResourceNotFoundException("Authenticated user record could not be found."));

        return new UserProfileResponse(user);
    }

    @Transactional
    public String processForgotPassword(ForgotPasswordRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();
        Optional<User> userOptional = userRepository.findByEmail(normalizedEmail);

        // Security best practice: avoid account enumeration
        if (userOptional.isEmpty()) {
            return null;
        }

        User user = userOptional.get();

        // Invalidate any existing unused reset tokens for this user
        tokenRepository.invalidateActiveTokensForUser(user);

        // Generate cryptographically secure random token (32 bytes = 256 bits)
        byte[] randomBytes = new byte[32];
        SECURE_RANDOM.nextBytes(randomBytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);

        // Store only the SHA-256 hash in MySQL
        String tokenHash = hashToken(rawToken);
        LocalDateTime expiry = LocalDateTime.now().plusMinutes(RESET_TOKEN_EXPIRATION_MINUTES);

        PasswordResetToken resetToken = new PasswordResetToken(tokenHash, user, expiry);
        tokenRepository.save(resetToken);

        // Send reset link to the user
        String resetLink = frontendUrl + "/reset-password?token=" + rawToken;
        emailService.sendPasswordResetEmail(user.getEmail(), resetLink);

        return resetLink;
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new IllegalArgumentException("Passwords do not match.");
        }

        validatePasswordStrength(request.getNewPassword());

        String rawToken = request.getToken().trim();
        String tokenHash = hashToken(rawToken);

        PasswordResetToken resetToken = tokenRepository.findByTokenHash(tokenHash)
            .orElseThrow(() -> new IllegalArgumentException("Invalid or expired password reset link."));

        if (resetToken.isUsed()) {
            throw new IllegalArgumentException("This password reset link has already been used.");
        }

        if (resetToken.isExpired()) {
            throw new IllegalArgumentException("This password reset link has expired. Please request a new one.");
        }

        User user = resetToken.getUser();
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        // Mark token as consumed
        resetToken.setUsed(true);
        tokenRepository.save(resetToken);
    }

    public static String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }

    private void validatePasswordStrength(String password) {
        if (password.length() < 8) {
            throw new IllegalArgumentException("Password must be at least 8 characters long.");
        }
        if (!UPPERCASE_PATTERN.matcher(password).find()) {
            throw new IllegalArgumentException("Password must contain at least one uppercase letter (A-Z).");
        }
        if (!LOWERCASE_PATTERN.matcher(password).find()) {
            throw new IllegalArgumentException("Password must contain at least one lowercase letter (a-z).");
        }
        if (!DIGIT_PATTERN.matcher(password).find()) {
            throw new IllegalArgumentException("Password must contain at least one numerical digit (0-9).");
        }
        if (!SPECIAL_CHAR_PATTERN.matcher(password).find()) {
            throw new IllegalArgumentException("Password must contain at least one special character (!@#$%^&*).");
        }
    }
}
