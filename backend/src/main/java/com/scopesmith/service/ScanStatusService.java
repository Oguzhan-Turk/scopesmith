package com.scopesmith.service;

import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory scan status tracker.
 * Allows the scan endpoint to return 202 immediately
 * while the client polls for completion.
 */
@Service
public class ScanStatusService {

    public enum Status { IDLE, SCANNING, FAILED }

    public record ScanState(Status status, String error) {
        static ScanState idle()                  { return new ScanState(Status.IDLE, null); }
        static ScanState scanning()              { return new ScanState(Status.SCANNING, null); }
        static ScanState failed(String message)  { return new ScanState(Status.FAILED, message); }
    }

    private final ConcurrentHashMap<Long, ScanState> states = new ConcurrentHashMap<>();

    public void setScanning(Long projectId) {
        states.put(projectId, ScanState.scanning());
    }

    public boolean trySetScanning(Long projectId) {
        return states.putIfAbsent(projectId, ScanState.scanning()) == null;
    }

    public void setDone(Long projectId) {
        states.remove(projectId);
    }

    public void setFailed(Long projectId, String error) {
        states.put(projectId, ScanState.failed(error));
    }

    public ScanState getState(Long projectId) {
        return states.getOrDefault(projectId, ScanState.idle());
    }

    public boolean isScanning(Long projectId) {
        return getState(projectId).status() == Status.SCANNING;
    }
}
