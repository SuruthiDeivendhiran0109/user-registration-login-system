# 🛡️ Full-Stack User Registration and Login System

A complete, production-grade User Registration, Authentication, and Profile Management web application built with **React (Vite)**, **Spring Boot 3 (Java 21)**, **Spring Security**, and **MySQL 8.0**.

---

## 📌 1. Project Overview & Features

* **Real MySQL Relational Persistence:** All registered users are persisted directly in MySQL (`user_management_db`) with indexed unique emails and safe Hibernate updates (`ddl-auto=update`).
* **Strict BCrypt Password Security:** Passwords are never logged, stored in plain text, or returned across API boundaries. Hashes are generated via Spring Security's `BCryptPasswordEncoder` (10 rounds).
* **Stateful Session Authentication:** Authentication is maintained via Spring Security sessions and an `HttpOnly`, `SameSite=Lax` session cookie (`AUTH_SESSION_ID`).
* **CSRF & CORS Hardening:** Cookie-based CSRF protection (`CookieCsrfTokenRepository.withHttpOnlyFalse()`) paired with a strict CORS whitelist (`http://localhost:3000`) with credentials enabled.
* **Authoritative Dashboard:** The dashboard never relies on `localStorage`, form state, or client-supplied IDs. It queries `GET /api/users/me` backed by the authenticated `SecurityContext` and MySQL.
* **Comprehensive Validation:** Strict dual-layer (client-side and Bean Validation server-side) verification across all 8 required fields.
* **Responsive Glassmorphism UI:** Built with React 18 and Tailwind CSS, featuring accessible ARIA form components, password strength meters, and adaptive layouts for mobile, tablet, and desktop.

---

## 🛠️ 2. Technology Stack & Prerequisites

### Technology Stack
* **Frontend:** React 18, Vite, React Router 6, Tailwind CSS, Lucide React
* **Backend:** Java 21 / Java 26, Spring Boot 3.3.4, Spring Security 6, Spring Data JPA, Hibernate, Bean Validation
* **Database:** MySQL Server 8.0 (`user_management_db`)
* **Build Tools:** Apache Maven 3.9.9, npm / Node.js 24

### Prerequisites
* **Node.js:** v18+ (verified with v24.11.1)
* **Java Development Kit (JDK):** JDK 21+ (verified with Oracle JDK 26.0.1)
* **MySQL Server:** 8.0+ running on port 3306

---

## 📂 3. Project Architecture & Directory Structure

```text
user-auth-app/
├── backend/
│   ├── database/
│   │   └── schema.sql                               # MySQL database & table creation script
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/example/usermanagement/
│   │   │   │   ├── config/
│   │   │   │   │   └── SecurityConfig.java          # Spring Security, CORS, CSRF, & Session rules
│   │   │   │   ├── controller/
│   │   │   │   │   ├── AuthController.java          # /api/auth/register, /login, /csrf, /health, /forgot-password, /reset-password
│   │   │   │   │   └── UserController.java          # Protected /api/users/me
│   │   │   │   ├── dto/
│   │   │   │   │   ├── RegisterRequest.java         # 8 validated registration fields
│   │   │   │   │   ├── LoginRequest.java            # Email & password credentials
│   │   │   │   │   ├── ForgotPasswordRequest.java   # Password reset request
│   │   │   │   │   ├── ResetPasswordRequest.java    # New password with token
│   │   │   │   │   ├── UserProfileResponse.java     # Safe user profile without password hash
│   │   │   │   │   ├── MessageResponse.java         # Success/status response wrapper
│   │   │   │   │   └── ErrorResponse.java           # Standardized error payload
│   │   │   │   ├── entity/
│   │   │   │   │   ├── User.java                    # JPA Entity mapped to 'users' table
│   │   │   │   │   └── PasswordResetToken.java      # JPA Entity mapped to 'password_reset_tokens'
│   │   │   │   ├── exception/
│   │   │   │   │   ├── DuplicateEmailException.java # HTTP 409 conflict exception
│   │   │   │   │   ├── ResourceNotFoundException.java # HTTP 404 not found exception
│   │   │   │   │   └── GlobalExceptionHandler.java  # ControllerAdvice error interceptor
│   │   │   │   ├── repository/
│   │   │   │   │   ├── UserRepository.java          # Spring Data JPA interface for users
│   │   │   │   │   └── PasswordResetTokenRepository.java # JPA interface for reset tokens
│   │   │   │   ├── security/
│   │   │   │   │   ├── UserDetailsImpl.java         # Spring Security UserDetails implementation
│   │   │   │   │   ├── UserDetailsServiceImpl.java  # Loads users by email from MySQL
│   │   │   │   │   └── RestAuthenticationEntryPoint.java # JSON 401 unauthenticated handler
│   │   │   │   ├── service/
│   │   │   │   │   ├── AuthService.java             # Registration, BCrypt hashing, & login logic
│   │   │   │   │   ├── EmailService.java            # SMTP reset email transmission
│   │   │   │   │   ├── PasswordResetService.java    # 256-bit token generation & hashing
│   │   │   │   │   └── UserService.java             # Profile retrieval from SecurityContext
│   │   │   │   └── UserManagementApplication.java   # Spring Boot Application entrypoint
│   │   │   └── resources/
│   │   │       ├── application.properties           # Spring Boot configuration with env fallbacks
│   │   │       └── schema.sql                       # Schema fallback
│   │   └── test/
│   │       └── java/com/example/usermanagement/
│   │           ├── AuthServiceTest.java             # Unit tests for registration & auth
│   │           └── AuthControllerTest.java          # MockMvc endpoint integration tests
│   ├── Dockerfile                                   # Multi-stage production container build (Java 21)
│   ├── .env.example                                 # Safe environment template
│   ├── .gitignore                                   # Ignore targets, secrets, and IDE caches
│   └── pom.xml                                      # Maven dependencies & build plugins
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── FormField.jsx                        # Accessible form input with ARIA & validation
│   │   │   ├── Navbar.jsx                           # Responsive header & navigation controls
│   │   │   ├── Notification.jsx                     # Toast notification banners
│   │   │   └── ProtectedRoute.jsx                   # Route guard redirecting to /login
│   │   ├── context/
│   │   │   └── AuthContext.jsx                      # Session provider & user state
│   │   ├── pages/
│   │   │   ├── Login.jsx                            # Glassmorphism login overlay
│   │   │   ├── Register.jsx                         # 8-field registration form
│   │   │   ├── ForgotPassword.jsx                   # Password reset request flow
│   │   │   ├── ResetPassword.jsx                    # Set new password with secure token
│   │   │   └── Dashboard.jsx                        # Authenticated MySQL profile dashboard
│   │   ├── services/
│   │   │   └── api.js                               # Fetch API with credentials & CSRF
│   │   ├── App.jsx                                  # React Router layout & routes
│   │   ├── main.jsx                                 # React root entrypoint
│   │   └── index.css                                # Tailwind CSS & glassmorphic styles
│   ├── .env.example                                 # Frontend environment template (VITE_API_URL)
│   ├── vercel.json                                  # SPA routing redirects for Vercel
│   ├── vite.config.js                               # Vite config with backend proxy (/api)
│   ├── tailwind.config.js                           # Tailwind tokens & themes
│   └── package.json                                 # React dependencies
│
└── README.md                                        # Master documentation
```

---

## 🗄️ 4. MySQL Database Setup

### Step 1: Initialize Database
Open your MySQL client or command prompt and run:

```sql
CREATE DATABASE IF NOT EXISTS user_management_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

*(You can also execute the complete SQL script located at [`backend/database/schema.sql`](file:///C:/Users/surut/.gemini/antigravity/scratch/user-auth-app/backend/database/schema.sql)).*

### Step 2: Configure Database Credentials
You can provide your MySQL credentials via **Environment Variables** or by setting them in `backend/src/main/resources/application.properties`:

**Option A (PowerShell Environment Variables):**
```powershell
$env:SPRING_DATASOURCE_USERNAME="root"
$env:SPRING_DATASOURCE_PASSWORD="your_actual_password_here"
```

**Option B (File Configuration):**
Open [`backend/src/main/resources/application.properties`](file:///C:/Users/surut/.gemini/antigravity/scratch/user-auth-app/backend/src/main/resources/application.properties) and update:
```properties
spring.datasource.username=root
spring.datasource.password=your_actual_password_here
```

---

## 🚀 5. How to Run the Application (Windows)

### Step 1: Start the Spring Boot Backend API
Open a terminal window:

```powershell
cd C:\Users\surut\.gemini\antigravity\scratch\user-auth-app\backend
& "C:\Users\surut\.gemini\antigravity\scratch\apache-maven-3.9.9\bin\mvn.cmd" spring-boot:run
```
*(Or simply `mvn spring-boot:run` if Maven is added to your system PATH)*

* **Backend Health Check:** `http://localhost:5000/api/health`
* **Port:** `5000`

### Step 2: Start the React Frontend
Open a second terminal window:

```powershell
cd C:\Users\surut\.gemini\antigravity\scratch\user-auth-app\frontend
cmd.exe /c npm run dev
```

* **Frontend URL:** `http://localhost:3000`

---

## 🌐 6. REST API Specification

| Method | Endpoint | Access | Description | Success Code |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Registers a new user into MySQL with BCrypt hashing | `201 Created` |
| `POST` | `/api/auth/login` | Public | Authenticates credentials and starts Spring Security session | `200 OK` |
| `POST` | `/api/auth/forgot-password` | Public | Initiates password reset & dispatches email with token | `200 OK` |
| `POST` | `/api/auth/reset-password` | Public | Validates 256-bit token & updates password in MySQL | `200 OK` |
| `GET` | `/api/users/me` | Authenticated | Retrieves current user's profile from MySQL | `200 OK` |
| `POST` | `/api/auth/logout` | Authenticated | Invalidates session and clears `AUTH_SESSION_ID` cookie | `200 OK` |
| `GET` | `/api/auth/csrf` | Public | Provides CSRF token (`XSRF-TOKEN`) | `200 OK` |
| `GET` | `/api/health` | Public | Reports service and database status | `200 OK` |

---

## 🧪 7. Automated & Manual Testing

### Automated Backend Tests (Maven Suite)
Run the automated test suite with Maven:

```powershell
cd backend
mvn test
```

**Test Results:**
* `AuthServiceTest.testRegisterUser_Success` ✅ Passed
* `AuthServiceTest.testRegisterUser_PasswordMismatch` ✅ Passed
* `AuthServiceTest.testRegisterUser_WeakPassword` ✅ Passed
* `AuthServiceTest.testRegisterUser_DuplicateEmail` ✅ Passed
* `AuthServiceTest.testAuthenticateUser_Success` ✅ Passed
* `AuthServiceTest.testForgotPassword_Success` ✅ Passed
* `AuthServiceTest.testResetPassword_Success` ✅ Passed
* `AuthControllerTest.testRegisterUser_ValidInput` ✅ Passed
* `AuthControllerTest.testLoginUser_Success` ✅ Passed
* **Summary:** `Tests run: 9, Failures: 0, Errors: 0, Skipped: 0` (100% Passed)

### Comprehensive Automated End-to-End Suite
* **Full Stack & Edge Case Suite (`qa/e2e-api-test.mjs`):** **96 / 96 checks passed (100%)**
  - Registration, 8-field negative validation, underage checks, duplicate prevention (409)
  - Direct MySQL persistence & BCrypt password hash verification
  - CSRF cookie lifecycle and session rotation
  - IDOR security, unauthorized protection (401), and logout invalidation
* **Password Reset Lifecycle Suite (`qa/test-reset-flow.js`):** **7 / 7 stages passed (100%)**
  - Reset request generation, 256-bit token creation, SHA-256 hash storage in MySQL
  - Reset password execution, old password rejection, new password login
  - Token replay prevention (reused token returns 400 Bad Request)
  - Invalid and expired token rejection (400 Bad Request)

### Manual Verification Checklist
1. **Registration:**
   - Navigate to `http://localhost:3000/register`.
   - Enter invalid or mismatched passwords — notice immediate inline validation error.
   - Fill all 8 fields and submit — record is persisted in MySQL and you are redirected to `/login`.
   - Attempting to register the same email again yields a `409 Conflict: An account with this email address already exists.`
2. **Authentication:**
   - Attempt to log in with an incorrect password — receives `401 Unauthorized: Invalid email or password`.
   - Log in with valid credentials — session is established and you are redirected to `/dashboard`.
3. **Protected Dashboard:**
   - Profile card displays verified details directly from MySQL (`first_name`, `last_name`, `date_of_birth`, `address`, `phone_number`, `email`, `created_at`).
   - Open a private/incognito window and visit `http://localhost:3000/dashboard` — immediately redirected to `/login`.
   - Refreshing the dashboard performs a live fetch to `GET /api/users/me`.
4. **Logout:**
   - Click **Log Out** on the dashboard.
   - Server session is invalidated, `AUTH_SESSION_ID` cookie is cleared, and user is redirected to `/login`.

---

## 💾 8. Database Backup & Maintenance

To create a complete backup of the `user_management_db` database, run:

```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe" -u root -p user_management_db > C:\Users\surut\backup_user_management_db.sql
```

To restore from a backup:
```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p user_management_db < C:\Users\surut\backup_user_management_db.sql
```

---

## ☁️ 9. Cloud Deployment Guide

This project is fully containerized and pre-configured for free/low-cost cloud hosting.

### A. Hosted MySQL Database (e.g. Aiven, TiDB Cloud, Railway)
1. Provision a free MySQL database instance on [Aiven for MySQL](https://aiven.io/) or [TiDB Cloud Serverless](https://tidbcloud.com/).
2. Run `backend/database/schema.sql` to initialize the database tables and indexes.
3. Note your JDBC connection URI, database username, and password.

### B. Spring Boot Backend (e.g. Render, Railway)
1. Deploy the `backend/` directory using the provided `backend/Dockerfile` (Eclipse Temurin Java 21).
2. Configure the following Environment Variables in your hosting dashboard:
   - `SPRING_DATASOURCE_URL`: `jdbc:mysql://<cloud-db-host>:<port>/<db_name>?useSSL=true&serverTimezone=UTC`
   - `SPRING_DATASOURCE_USERNAME`: `<cloud-db-user>`
   - `SPRING_DATASOURCE_PASSWORD`: `<cloud-db-password>`
   - `APP_FRONTEND_URL`: `https://<your-frontend-domain>.vercel.app`
   - `APP_CORS_ALLOWED_ORIGINS`: `https://<your-frontend-domain>.vercel.app`
   - `SESSION_COOKIE_SECURE`: `true`
   - `SESSION_COOKIE_SAME_SITE`: `None`
   - `SPRING_MAIL_HOST`: `smtp.gmail.com`
   - `SPRING_MAIL_PORT`: `587`
   - `SPRING_MAIL_USERNAME`: `<your-gmail-address>`
   - `SPRING_MAIL_PASSWORD`: `<your-gmail-app-password>`
   - `SPRING_MAIL_PROPERTIES_MAIL_SMTP_AUTH`: `true`
   - `SPRING_MAIL_PROPERTIES_MAIL_SMTP_STARTTLS_ENABLE`: `true`

### C. React Frontend (e.g. Vercel, Netlify)
1. Deploy the `frontend/` directory to [Vercel](https://vercel.com/) or Netlify.
   - Build Command: `npm run build`
   - Output Directory: `dist`
2. Configure Environment Variable:
   - `VITE_API_URL`: `https://<your-backend-domain>.onrender.com/api`
3. SPA routing redirects are pre-configured via `vercel.json` and `_redirects`.
