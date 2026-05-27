# Build stage
FROM maven:3.9-eclipse-temurin-17 AS builder

WORKDIR /app

COPY pom.xml ./
RUN mvn -B -q dependency:go-offline

COPY src ./src
RUN mvn -B -q clean package -DskipTests

# Runtime stage
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

COPY --from=builder /app/target/auth-*.jar app.jar

EXPOSE 8084

ENTRYPOINT ["java", "-jar", "app.jar"]
