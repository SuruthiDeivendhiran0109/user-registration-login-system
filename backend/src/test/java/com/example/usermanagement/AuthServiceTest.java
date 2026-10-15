package com.example.usermanagement;

import com.example.usermanagement.dto.LoginRequest;
import com.example.usermanagement.dto.RegisterRequest;
import com.example.usermanagement.dto.UserProfileResponse;
import com.example.usermanagement.entity.User;
import com.example.usermanagement.exception.DuplicateEmailException;
import com.example.usermanagement.repository.UserRepository;
import com.example.usermanagement.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private com.example.usermanagement.repository.PasswordResetTokenRepository tokenRepository;

    @Mock
    private com.example.usermanagement.service.EmailService emailService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private HttpServletRequest httpRequest;

    @Mock
    private HttpSession httpSession;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private AuthService authService;

    private RegisterRequest validRegisterRequest;

    @BeforeEach
    void setUp() {
        validRegisterRequest = new RegisterRequest();
        validRegisterRequest.setFirstName("Jane");
        validRegisterRequest.setLastName("Doe");
        validRegisterRequest.setDateOfBirth(LocalDate.of(1995, 5, 20));
        validRegisterRequest.setAddress("123 Maple Street, City, State");
        validRegisterRequest.setPhoneNumber("9876543210");
        validRegisterRequest.setEmail("jane.doe@example.com");
        validRegisterRequest.setPassword("SecurePass@123");
        validRegisterRequest.setConfirmPassword("SecurePass@123");
    }

    @Test
    @DisplayName("Should successfully register a new user and hash password")
    void testRegisterUser_Success() {
        when(userRepository.existsByEmail("jane.doe@example.com")).thenReturn(false);
        when(passwordEncoder.encode("SecurePass@123")).thenReturn("$2a$10$hashedPasswordSample");

        User savedUser = new User(
            "Jane", "Doe", LocalDate.of(1995, 5, 20),
            "123 Maple Street, City, State", "9876543210",
            "jane.doe@example.com", "$2a$10$hashedPasswordSample"
        );
        savedUser.setId(1L);

        when(userRepository.save(any(User.class))).thenReturn(savedUser);

        UserProfileResponse response = authService.registerUser(validRegisterRequest);

        assertNotNull(response);
        assertEquals(1L, response.getId());
        assertEquals("Jane", response.getFirstName());
        assertEquals("Doe", response.getLastName());
        assertEquals("jane.doe@example.com", response.getEmail());

        verify(passwordEncoder, times(1)).encode("SecurePass@123");
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    @DisplayName("Should throw exception when password and confirmPassword do not match")
    void testRegisterUser_PasswordMismatch() {
        validRegisterRequest.setConfirmPassword("DifferentPassword@123");

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            authService.registerUser(validRegisterRequest);
        });

        assertEquals("Passwords do not match.", ex.getMessage());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Should throw exception when password is weak")
    void testRegisterUser_WeakPassword() {
        validRegisterRequest.setPassword("weak");
        validRegisterRequest.setConfirmPassword("weak");

        assertThrows(IllegalArgumentException.class, () -> {
            authService.registerUser(validRegisterRequest);
        });

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Should throw DuplicateEmailException when email already exists")
    void testRegisterUser_DuplicateEmail() {
        when(userRepository.existsByEmail("jane.doe@example.com")).thenReturn(true);

        assertThrows(DuplicateEmailException.class, () -> {
            authService.registerUser(validRegisterRequest);
        });

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Should authenticate user and return profile")
    void testAuthenticateUser_Success() {
        LoginRequest loginRequest = new LoginRequest("jane.doe@example.com", "SecurePass@123");

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
            .thenReturn(authentication);
        when(httpRequest.getSession(true)).thenReturn(httpSession);

        User user = new User(
            "Jane", "Doe", LocalDate.of(1995, 5, 20),
            "123 Maple Street, City, State", "9876543210",
            "jane.doe@example.com", "$2a$10$hashedPasswordSample"
        );
        user.setId(1L);

        when(userRepository.findByEmail("jane.doe@example.com")).thenReturn(Optional.of(user));

        UserProfileResponse response = authService.authenticateUser(loginRequest, httpRequest);

        assertNotNull(response);
        assertEquals("jane.doe@example.com", response.getEmail());
        verify(authenticationManager, times(1)).authenticate(any(UsernamePasswordAuthenticationToken.class));
    }

    @Test
    @DisplayName("Should generate token and call emailService on valid forgot password request")
    void testProcessForgotPassword_Success() {
        User user = new User(
            "Jane", "Doe", LocalDate.of(1995, 5, 20),
            "123 Maple Street", "9876543210",
            "jane.doe@example.com", "$2a$10$hashed"
        );
        when(userRepository.findByEmail("jane.doe@example.com")).thenReturn(Optional.of(user));

        com.example.usermanagement.dto.ForgotPasswordRequest request = new com.example.usermanagement.dto.ForgotPasswordRequest();
        request.setEmail("jane.doe@example.com");

        String link = authService.processForgotPassword(request);

        assertNotNull(link);
        assertTrue(link.contains("/reset-password?token="));
        verify(tokenRepository, times(1)).invalidateActiveTokensForUser(user);
        verify(tokenRepository, times(1)).save(any(com.example.usermanagement.entity.PasswordResetToken.class));
        verify(emailService, times(1)).sendPasswordResetEmail(eq("jane.doe@example.com"), contains("/reset-password?token="));
    }

    @Test
    @DisplayName("Should successfully reset password and mark token as used")
    void testResetPassword_Success() {
        User user = new User("Jane", "Doe", LocalDate.of(1995, 5, 20), "123 Maple", "9876543210", "jane.doe@example.com", "$2a$10$old");
        com.example.usermanagement.entity.PasswordResetToken token = new com.example.usermanagement.entity.PasswordResetToken(
            "valid-token", AuthService.hashToken("valid-token"), user, java.time.LocalDateTime.now().plusMinutes(10)
        );

        when(tokenRepository.findByTokenHashOrToken(AuthService.hashToken("valid-token"), "valid-token")).thenReturn(Optional.of(token));
        when(passwordEncoder.encode("NewSecurePassword@123")).thenReturn("$2a$10$newHashed");

        com.example.usermanagement.dto.ResetPasswordRequest request = new com.example.usermanagement.dto.ResetPasswordRequest();
        request.setToken("valid-token");
        request.setNewPassword("NewSecurePassword@123");
        request.setConfirmPassword("NewSecurePassword@123");

        authService.resetPassword(request);

        assertTrue(token.isUsed());
        verify(userRepository, times(1)).save(user);
        verify(tokenRepository, times(1)).save(token);
    }
}
