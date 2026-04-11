package com.scopesmith.config;

import com.scopesmith.dto.SyncPolicyCheckResponse;
import com.scopesmith.service.SyncPolicyViolationException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void shouldPreserveStatusAndReasonForResponseStatusException() {
        ResponseStatusException ex = new ResponseStatusException(HttpStatus.NOT_FOUND, "Analysis not found");

        ResponseEntity<Map<String, Object>> response = handler.handleResponseStatusException(ex);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(404, response.getBody().get("status"));
        assertEquals("Not Found", response.getBody().get("error"));
        assertEquals("Analysis not found", response.getBody().get("message"));
    }

    @Test
    void shouldUseStatusReasonWhenExceptionReasonIsMissing() {
        ResponseStatusException ex = new ResponseStatusException(HttpStatus.UNAUTHORIZED);

        ResponseEntity<Map<String, Object>> response = handler.handleResponseStatusException(ex);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(401, response.getBody().get("status"));
        assertEquals("Unauthorized", response.getBody().get("error"));
        assertEquals("Unauthorized", response.getBody().get("message"));
    }

    @Test
    void shouldIncludePolicyCheckPayloadOnSyncPolicyViolation() {
        SyncPolicyCheckResponse report = SyncPolicyCheckResponse.builder()
                .passed(false)
                .status("FAIL")
                .message("Policy gate failed")
                .build();

        Map<String, Object> response = handler.handleSyncPolicyViolation(new SyncPolicyViolationException(report));

        assertEquals(409, response.get("status"));
        assertEquals("SYNC_POLICY_FAILED", response.get("code"));
        assertTrue(response.containsKey("policyCheck"));
    }
}
