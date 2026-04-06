package com.scopesmith.service.validation;

import com.scopesmith.dto.ProjectContextResult;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

@Component
@Slf4j
public class ProjectContextResultValidator {

    public ProjectContextResult validate(ProjectContextResult result, ValidationContext context) {
        if (result == null) return result;

        // Null-safe all lists
        if (result.getModules() == null) result.setModules(new ArrayList<>());
        if (result.getEntities() == null) result.setEntities(new ArrayList<>());
        if (result.getApiEndpoints() == null) result.setApiEndpoints(new ArrayList<>());
        if (result.getExternalIntegrations() == null) result.setExternalIntegrations(new ArrayList<>());
        if (result.getKeyObservations() == null) result.setKeyObservations(new ArrayList<>());

        // Deduplicate modules by name
        Set<String> seenModules = new HashSet<>();
        result.setModules(result.getModules().stream()
            .filter(m -> m.getName() != null && seenModules.add(m.getName().toLowerCase(Locale.ENGLISH)))
            .collect(Collectors.toList()));

        // Deduplicate entities by name
        Set<String> seenEntities = new HashSet<>();
        result.setEntities(result.getEntities().stream()
            .filter(e -> e.getName() != null && seenEntities.add(e.getName().toLowerCase(Locale.ENGLISH)))
            .collect(Collectors.toList()));

        // Deduplicate string lists
        deduplicateStringList(result.getApiEndpoints());
        deduplicateStringList(result.getExternalIntegrations());
        deduplicateStringList(result.getKeyObservations());

        // Null-safe tech stack
        if (result.getTechStack() != null) {
            var ts = result.getTechStack();
            if (ts.getLanguages() == null) ts.setLanguages(new ArrayList<>());
            if (ts.getFrameworks() == null) ts.setFrameworks(new ArrayList<>());
            if (ts.getDatabases() == null) ts.setDatabases(new ArrayList<>());
            if (ts.getBuildTools() == null) ts.setBuildTools(new ArrayList<>());
            if (ts.getOtherTools() == null) ts.setOtherTools(new ArrayList<>());
        }

        return result;
    }

    private void deduplicateStringList(List<String> list) {
        if (list == null || list.size() <= 1) return;
        Set<String> seen = new LinkedHashSet<>();
        list.removeIf(item -> !seen.add(item));
    }
}
