package com.example.usermanagement.controller;

import com.example.usermanagement.dto.UserProfileResponse;
import com.example.usermanagement.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getCurrentUser() {
        UserProfileResponse userProfile = userService.getCurrentUserProfile();

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("user", userProfile);

        return ResponseEntity.ok(response);
    }
}
