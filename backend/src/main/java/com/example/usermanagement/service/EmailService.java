package com.example.usermanagement.service;

import com.example.usermanagement.exception.EmailDeliveryException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    @Value("${app.mail.from:${spring.mail.username:}}")
    private String fromEmail;

    @Value("${spring.mail.host:}")
    private String mailHost;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${spring.mail.password:}")
    private String mailPassword;

    public EmailService(@Autowired(required = false) JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    /**
     * An email provider is considered configured if a real remote mail host is specified
     * or mail credentials are provided.
     */
    public boolean isConfigured() {
        if (mailSender == null) {
            return false;
        }
        if (mailHost == null || mailHost.trim().isEmpty()) {
            return false;
        }
        String host = mailHost.trim().toLowerCase();
        if (host.equals("localhost") || host.equals("127.0.0.1")) {
            return mailUsername != null && !mailUsername.trim().isEmpty();
        }
        return true;
    }

    public boolean sendPasswordResetEmail(String recipientEmail, String resetLink) {
        log.info("Processing password reset email for: {}", recipientEmail);

        if (!isConfigured()) {
            log.warn("⚠️ SMTP Email delivery is not configured! Host: '{}', User: '{}'", mailHost, mailUsername);
            log.warn("🔗 [DEV MODE RESET LINK]: {}", resetLink);
            return false;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            String effectiveFrom = (fromEmail != null && !fromEmail.trim().isEmpty()) ? fromEmail.trim() : mailUsername;
            if (effectiveFrom != null && !effectiveFrom.trim().isEmpty()) {
                message.setFrom(effectiveFrom);
            }
            message.setTo(recipientEmail);
            message.setSubject("Password Reset Request - AuthVault");
            message.setText("Hello,\n\n"
                + "We received a request to reset your password for your AuthVault account.\n\n"
                + "Please click the link below to set a new password:\n"
                + resetLink + "\n\n"
                + "This link is valid for 15 minutes and can only be used once.\n\n"
                + "If you did not make this request, you can safely ignore this email.\n\n"
                + "Best regards,\nAuthVault Security Team");

            mailSender.send(message);
            log.info("Password reset email sent successfully via SMTP to: {}", recipientEmail);
            return true;
        } catch (Exception ex) {
            log.error("Failed to deliver password reset email to {}: {}. Reset link was: {}",
                      recipientEmail, ex.getMessage(), resetLink, ex);
            throw new EmailDeliveryException(
                "Failed to deliver email to " + recipientEmail + " via SMTP server (" + mailHost + "): " + ex.getMessage(),
                ex
            );
        }
    }
}
