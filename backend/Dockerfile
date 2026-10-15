# Multi-stage Dockerfile for Spring Boot Backend (Java 21)
# Build Stage
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app

# Copy pom.xml and download dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source code and build production jar
COPY src ./src
RUN mvn clean package -DskipTests

# Runtime Stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Add non-root application user for container security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Copy jar artifact from build stage
COPY --from=build /app/target/user-management-backend-1.0.0.jar app.jar

# Configurable port (default 5000, Render/Railway provide PORT)
ENV SERVER_PORT=5000
EXPOSE 5000

# Run Spring Boot application
ENTRYPOINT ["sh", "-c", "java -Dserver.port=${PORT:-5000} -Djava.security.egd=file:/dev/./urandom -jar app.jar"]
