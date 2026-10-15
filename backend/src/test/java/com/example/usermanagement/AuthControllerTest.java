package com.example.usermanagement;

import com.example.usermanagement.controller.AuthController;
import com.example.usermanagement.dto.LoginRequest;
import com.example.usermanagement.dto.RegisterRequest;
import com.example.usermanagement.dto.UserProfileResponse;
import com.example.usermanagement.entity.User;
import com.example.usermanagement.service.AuthService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDate;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    private MockMvc mockMvc;

    @Mock
    private AuthService authService;

    @Mock
    private com.example.usermanagement.service.EmailService emailService;

    @Mock
    private javax.sql.DataSource dataSource;

    @InjectMocks
    private AuthController authController;

    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(authController)
                .setControllerAdvice(new com.example.usermanagement.exception.GlobalExceptionHandler())
                .build();
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
    }

    @Test
    @DisplayName("POST /api/auth/register returns 201 when registration data is valid")
    void testRegisterUser_ValidInput() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setFirstName("John");
        request.setLastName("Smith");
        request.setDateOfBirth(LocalDate.of(1990, 1, 15));
        request.setAddress("456 Elm Avenue, Springfield");
        request.setPhoneNumber("9876543210");
        request.setEmail("john.smith@example.com");
        request.setPassword("StrongP@ss1");
        request.setConfirmPassword("StrongP@ss1");

        User user = new User(
            "John", "Smith", LocalDate.of(1990, 1, 15),
            "456 Elm Avenue, Springfield", "9876543210",
            "john.smith@example.com", "$2a$10$dummyHash"
        );
        user.setId(2L);

        when(authService.registerUser(any(RegisterRequest.class))).thenReturn(new UserProfileResponse(user));

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.user.email").value("john.smith@example.com"))
            .andExpect(jsonPath("$.user.phoneNumber").value("9876543210"));
    }

    @Test
    @DisplayName("POST /api/auth/register returns 400 when phone number is less than 10 digits")
    void testRegisterUser_PhoneTooShort() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setFirstName("John");
        request.setLastName("Smith");
        request.setDateOfBirth(LocalDate.of(1990, 1, 15));
        request.setAddress("456 Elm Avenue, Springfield");
        request.setPhoneNumber("987654321"); // 9 digits
        request.setEmail("john.smith@example.com");
        request.setPassword("StrongP@ss1");
        request.setConfirmPassword("StrongP@ss1");

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.status").value(400))
            .andExpect(jsonPath("$.fieldErrors.phoneNumber").value("Phone number must contain exactly 10 digits."));
    }

    @Test
    @DisplayName("POST /api/auth/register returns 400 when phone number exceeds 10 digits")
    void testRegisterUser_PhoneTooLong() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setFirstName("John");
        request.setLastName("Smith");
        request.setDateOfBirth(LocalDate.of(1990, 1, 15));
        request.setAddress("456 Elm Avenue, Springfield");
        request.setPhoneNumber("98765432100"); // 11 digits
        request.setEmail("john.smith@example.com");
        request.setPassword("StrongP@ss1");
        request.setConfirmPassword("StrongP@ss1");

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.status").value(400))
            .andExpect(jsonPath("$.fieldErrors.phoneNumber").value("Phone number must contain exactly 10 digits."));
    }

    @Test
    @DisplayName("POST /api/auth/register returns 400 when phone number contains non-digits")
    void testRegisterUser_PhoneNonDigits() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setFirstName("John");
        request.setLastName("Smith");
        request.setDateOfBirth(LocalDate.of(1990, 1, 15));
        request.setAddress("456 Elm Avenue, Springfield");
        request.setPhoneNumber("987654321a"); // Contains letter
        request.setEmail("john.smith@example.com");
        request.setPassword("StrongP@ss1");
        request.setConfirmPassword("StrongP@ss1");

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.status").value(400))
            .andExpect(jsonPath("$.fieldErrors.phoneNumber").value("Phone number must contain exactly 10 digits."));
    }

    @Test
    @DisplayName("POST /api/auth/register returns 400 when first name starts with lowercase letter")
    void testRegisterUser_FirstName_Lowercase() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setFirstName("arun"); // lowercase
        request.setLastName("Smith");
        request.setDateOfBirth(LocalDate.of(1990, 1, 15));
        request.setAddress("456 Elm Avenue, Springfield");
        request.setPhoneNumber("9876543210");
        request.setEmail("arun.smith@example.com");
        request.setPassword("StrongP@ss1");
        request.setConfirmPassword("StrongP@ss1");

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.status").value(400))
            .andExpect(jsonPath("$.fieldErrors.firstName").value("First name must start with an uppercase letter (A-Z)."));
    }

    @Test
    @DisplayName("POST /api/auth/register returns 400 when first name starts with digit")
    void testRegisterUser_FirstName_StartsWithDigit() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setFirstName("1Arun"); // starts with digit
        request.setLastName("Smith");
        request.setDateOfBirth(LocalDate.of(1990, 1, 15));
        request.setAddress("456 Elm Avenue, Springfield");
        request.setPhoneNumber("9876543210");
        request.setEmail("arun.smith@example.com");
        request.setPassword("StrongP@ss1");
        request.setConfirmPassword("StrongP@ss1");

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.status").value(400))
            .andExpect(jsonPath("$.fieldErrors.firstName").value("First name must start with an uppercase letter (A-Z)."));
    }

    @Test
    @DisplayName("POST /api/auth/login returns 200 when credentials are valid")
    void testLoginUser_Success() throws Exception {
        LoginRequest loginRequest = new LoginRequest("john.smith@example.com", "StrongP@ss1");

        User user = new User(
            "John", "Smith", LocalDate.of(1990, 1, 15),
            "456 Elm Avenue, Springfield", "9876543210",
            "john.smith@example.com", "$2a$10$dummyHash"
        );
        user.setId(2L);

        when(authService.authenticateUser(any(LoginRequest.class), any())).thenReturn(new UserProfileResponse(user));

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.user.email").value("john.smith@example.com"));
    }
}
