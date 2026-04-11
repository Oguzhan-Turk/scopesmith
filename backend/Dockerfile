# ── Stage 1: Build ───────────────────────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Download dependencies first (layer cache — only re-downloads when pom.xml changes)
COPY pom.xml .
RUN mvn dependency:go-offline -q

# Build the application
COPY src ./src
RUN mvn package -DskipTests -q

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre
WORKDIR /app

# Non-root user for security
RUN groupadd -r scopesmith && useradd -r -g scopesmith scopesmith
USER scopesmith

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

# JVM tuning: prefer container memory limits; use G1GC for low-latency
ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-XX:+UseG1GC", \
  "-jar", "app.jar"]
