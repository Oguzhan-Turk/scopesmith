package com.scopesmith.repository;

import com.scopesmith.entity.Prompt;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PromptRepository extends JpaRepository<Prompt, Long> {
    Optional<Prompt> findByName(String name);
}
