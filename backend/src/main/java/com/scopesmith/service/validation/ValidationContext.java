package com.scopesmith.service.validation;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class ValidationContext {
    private Long projectId;
    @Builder.Default
    private List<String> knownModules = List.of();
}
