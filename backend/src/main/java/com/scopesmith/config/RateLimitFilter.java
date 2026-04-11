package com.scopesmith.config;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.concurrent.TimeUnit;

/**
 * Two-tier rate limiting filter:
 *
 * <ul>
 *   <li><b>Login</b> ({@code POST /api/v1/auth/login}): 5 attempts per IP per 15 minutes.
 *       Prevents brute-force password attacks.</li>
 *   <li><b>Mutating API calls</b> ({@code POST/PUT/DELETE /api/v1/**}, excluding auth):
 *       30 requests per authenticated user per minute.
 *       Prevents runaway AI cost and accidental hammering.</li>
 * </ul>
 *
 * <p>Implementation: Bucket4j token-bucket algorithm + Caffeine in-memory cache.
 * No Redis required — suitable for single-instance deployments.
 * For multi-instance deployments, replace the Caffeine cache with a Bucket4j
 * distributed backend (Redis/Hazelcast).
 */
@Component
@Order(10)          // runs early, before security filter chain processes the request
@Slf4j
public class RateLimitFilter extends OncePerRequestFilter {

    // ─── Login limits ────────────────────────────────────────────────────────

    /** Max login attempts per IP within {@link #LOGIN_WINDOW}. */
    private static final int    LOGIN_CAPACITY = 5;
    private static final Duration LOGIN_WINDOW  = Duration.ofMinutes(15);

    // ─── API limits ──────────────────────────────────────────────────────────

    /** Max mutating API calls per authenticated user per {@link #API_WINDOW}. */
    private static final int    API_CAPACITY = 30;
    private static final Duration API_WINDOW   = Duration.ofMinutes(1);

    // ─── Caches ──────────────────────────────────────────────────────────────

    /** IP → login bucket. Entries expire after the window elapses with no access. */
    private final Cache<String, Bucket> loginBuckets = Caffeine.newBuilder()
            .expireAfterAccess(LOGIN_WINDOW.toMinutes() + 1, TimeUnit.MINUTES)
            .maximumSize(10_000)
            .build();

    /** Username → API bucket. */
    private final Cache<String, Bucket> apiBuckets = Caffeine.newBuilder()
            .expireAfterAccess(API_WINDOW.toMinutes() + 1, TimeUnit.MINUTES)
            .maximumSize(5_000)
            .build();

    // ─── Filter logic ────────────────────────────────────────────────────────

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain)
            throws ServletException, IOException {

        String method = request.getMethod();
        String path   = request.getRequestURI();

        // ── Login rate limit ──────────────────────────────────────────────
        if ("POST".equalsIgnoreCase(method) && path.startsWith("/api/v1/auth/login")) {
            String ip = resolveClientIp(request);
            Bucket bucket = loginBuckets.get(ip, k -> newBucket(LOGIN_CAPACITY, LOGIN_WINDOW));
            if (!bucket.tryConsume(1)) {
                log.warn("Login rate limit exceeded for IP {}", ip);
                rejectWithTooManyRequests(response,
                        "Çok fazla giriş denemesi. Lütfen " + LOGIN_WINDOW.toMinutes() + " dakika bekleyin.");
                return;
            }
        }

        // ── API rate limit (mutating calls by authenticated user) ─────────
        else if (isMutatingApiCall(method, path)) {
            String username = resolveUsername();
            if (username != null) {
                Bucket bucket = apiBuckets.get(username, k -> newBucket(API_CAPACITY, API_WINDOW));
                if (!bucket.tryConsume(1)) {
                    log.warn("API rate limit exceeded for user '{}'", username);
                    rejectWithTooManyRequests(response,
                            "İstek limiti aşıldı. Lütfen 1 dakika bekleyin.");
                    return;
                }
            }
        }

        chain.doFilter(request, response);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private static boolean isMutatingApiCall(String method, String path) {
        if (!path.startsWith("/api/v1/")) return false;
        if (path.startsWith("/api/v1/auth/")) return false;
        return "POST".equalsIgnoreCase(method)
                || "PUT".equalsIgnoreCase(method)
                || "DELETE".equalsIgnoreCase(method);
    }

    private static Bucket newBucket(int capacity, Duration window) {
        return Bucket.builder()
                .addLimit(Bandwidth.builder()
                        .capacity(capacity)
                        .refillIntervally(capacity, window)
                        .build())
                .build();
    }

    /**
     * Resolve real client IP, honouring X-Forwarded-For when behind a proxy/load-balancer.
     */
    private static String resolveClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            // X-Forwarded-For: client, proxy1, proxy2 — take the leftmost (original client)
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private static String resolveUsername() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return null;
        }
        return auth.getName();
    }

    private static void rejectWithTooManyRequests(HttpServletResponse response, String message)
            throws IOException {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(
                "{\"status\":429,\"error\":\"Too Many Requests\",\"message\":\"" + message + "\"}"
        );
    }
}
