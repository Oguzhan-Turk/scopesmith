package com.scopesmith.service;

import com.scopesmith.dto.DependencyInfo;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@Slf4j
public class DependencyParsingService {

    private static final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Auto-detect build file type and parse dependencies.
     */
    public List<DependencyInfo> parse(String filename, String content) {
        if (content == null || content.isBlank()) return List.of();

        return switch (filename.toLowerCase(Locale.ENGLISH)) {
            case "pom.xml" -> parseMaven(content);
            case "package.json" -> parseNpm(content);
            case "build.gradle", "build.gradle.kts" -> parseGradle(content);
            case "requirements.txt" -> parsePython(content);
            case "go.mod" -> parseGoMod(content);
            default -> List.of();
        };
    }

    /**
     * Parse Maven pom.xml — extract dependencies with groupId, artifactId, version, scope.
     */
    public List<DependencyInfo> parseMaven(String pomXml) {
        List<DependencyInfo> deps = new ArrayList<>();

        // Extract parent version for inheritance
        String parentVersion = extractXmlValue(pomXml, "parent", "version");
        // Extract project-level version
        String projectVersion = extractTopLevelXmlTag(pomXml, "version");

        // Extract properties for variable resolution
        Map<String, String> properties = new HashMap<>();
        Pattern propPattern = Pattern.compile("<([a-zA-Z0-9._-]+)>([^<]+)</\\1>", Pattern.MULTILINE);
        // Find properties block
        int propsStart = pomXml.indexOf("<properties>");
        int propsEnd = pomXml.indexOf("</properties>");
        if (propsStart >= 0 && propsEnd > propsStart) {
            String propsBlock = pomXml.substring(propsStart, propsEnd);
            Matcher pm = propPattern.matcher(propsBlock);
            while (pm.find()) {
                properties.put(pm.group(1), pm.group(2));
            }
        }
        // Add parent/project version
        if (parentVersion != null) properties.put("project.parent.version", parentVersion);
        if (projectVersion != null) properties.put("project.version", projectVersion);

        // Extract dependencies
        Pattern depPattern = Pattern.compile(
            "<dependency>\\s*" +
            "<groupId>([^<]+)</groupId>\\s*" +
            "<artifactId>([^<]+)</artifactId>\\s*" +
            "(?:<version>([^<]*)</version>\\s*)?" +
            "(?:<scope>([^<]*)</scope>\\s*)?" +
            "(?:<optional>[^<]*</optional>\\s*)?" +
            "</dependency>",
            Pattern.DOTALL
        );

        Matcher m = depPattern.matcher(pomXml);
        while (m.find()) {
            String groupId = m.group(1).trim();
            String artifactId = m.group(2).trim();
            String version = m.group(3) != null ? resolveProperty(m.group(3).trim(), properties) : parentVersion;
            String scope = m.group(4) != null ? m.group(4).trim().toUpperCase(Locale.ENGLISH) : "COMPILE";

            deps.add(DependencyInfo.builder()
                .group(groupId)
                .name(artifactId)
                .version(version)
                .scope(scope)
                .build());
        }

        log.debug("Parsed {} Maven dependencies", deps.size());
        return deps;
    }

    /**
     * Parse npm package.json — extract dependencies and devDependencies.
     */
    public List<DependencyInfo> parseNpm(String packageJson) {
        List<DependencyInfo> deps = new ArrayList<>();
        try {
            JsonNode root = objectMapper.readTree(packageJson);

            // dependencies
            JsonNode depsNode = root.get("dependencies");
            if (depsNode != null && depsNode.isObject()) {
                depsNode.fields().forEachRemaining(entry -> {
                    deps.add(DependencyInfo.builder()
                        .name(entry.getKey())
                        .version(entry.getValue().asText().replaceAll("^[~^>=<]", ""))
                        .scope("COMPILE")
                        .build());
                });
            }

            // devDependencies
            JsonNode devDepsNode = root.get("devDependencies");
            if (devDepsNode != null && devDepsNode.isObject()) {
                devDepsNode.fields().forEachRemaining(entry -> {
                    deps.add(DependencyInfo.builder()
                        .name(entry.getKey())
                        .version(entry.getValue().asText().replaceAll("^[~^>=<]", ""))
                        .scope("DEV")
                        .build());
                });
            }
        } catch (Exception e) {
            log.warn("Failed to parse package.json: {}", e.getMessage());
        }

        log.debug("Parsed {} npm dependencies", deps.size());
        return deps;
    }

    /**
     * Parse Gradle build.gradle — extract dependencies.
     */
    public List<DependencyInfo> parseGradle(String buildGradle) {
        List<DependencyInfo> deps = new ArrayList<>();

        // Match: implementation 'group:artifact:version'  OR  implementation "group:artifact:version"
        Pattern p1 = Pattern.compile(
            "(implementation|api|compileOnly|runtimeOnly|testImplementation|testRuntimeOnly|annotationProcessor)" +
            "\\s+['\"]([^:]+):([^:]+):([^'\"]+)['\"]"
        );

        Matcher m = p1.matcher(buildGradle);
        while (m.find()) {
            String config = m.group(1);
            String scope = mapGradleScope(config);

            deps.add(DependencyInfo.builder()
                .group(m.group(2).trim())
                .name(m.group(3).trim())
                .version(m.group(4).trim())
                .scope(scope)
                .build());
        }

        // Match: implementation("group:artifact:version")  (Kotlin DSL)
        Pattern p2 = Pattern.compile(
            "(implementation|api|compileOnly|runtimeOnly|testImplementation|testRuntimeOnly|annotationProcessor)" +
            "\\(\"([^:]+):([^:]+):([^\"]+)\"\\)"
        );
        Matcher m2 = p2.matcher(buildGradle);
        while (m2.find()) {
            String config = m2.group(1);
            String scope = mapGradleScope(config);
            deps.add(DependencyInfo.builder()
                .group(m2.group(2).trim())
                .name(m2.group(3).trim())
                .version(m2.group(4).trim())
                .scope(scope)
                .build());
        }

        log.debug("Parsed {} Gradle dependencies", deps.size());
        return deps;
    }

    /**
     * Parse Python requirements.txt — extract package==version lines.
     */
    public List<DependencyInfo> parsePython(String requirementsTxt) {
        List<DependencyInfo> deps = new ArrayList<>();

        for (String line : requirementsTxt.split("\n")) {
            line = line.trim();
            if (line.isEmpty() || line.startsWith("#") || line.startsWith("-")) continue;

            // package==version, package>=version, package~=version
            Pattern p = Pattern.compile("^([a-zA-Z0-9_.-]+)\\s*([=<>~!]+)\\s*(.+)$");
            Matcher m = p.matcher(line);
            if (m.find()) {
                deps.add(DependencyInfo.builder()
                    .name(m.group(1))
                    .version(m.group(3).trim())
                    .scope("COMPILE")
                    .build());
            } else if (!line.contains(" ")) {
                // Just package name without version
                deps.add(DependencyInfo.builder()
                    .name(line)
                    .scope("COMPILE")
                    .build());
            }
        }

        log.debug("Parsed {} Python dependencies", deps.size());
        return deps;
    }

    /**
     * Parse Go go.mod — extract require statements.
     */
    public List<DependencyInfo> parseGoMod(String goMod) {
        List<DependencyInfo> deps = new ArrayList<>();
        boolean inRequire = false;

        for (String line : goMod.split("\n")) {
            line = line.trim();

            if (line.startsWith("require (")) {
                inRequire = true;
                continue;
            }
            if (line.equals(")")) {
                inRequire = false;
                continue;
            }

            // Single require or inside block
            String target = inRequire ? line : (line.startsWith("require ") ? line.substring(8).trim() : null);
            if (target == null || target.startsWith("//")) continue;

            String[] parts = target.split("\\s+");
            if (parts.length >= 2) {
                String module = parts[0];
                String version = parts[1];
                // Extract name from module path
                String name = module.contains("/") ? module.substring(module.lastIndexOf('/') + 1) : module;

                deps.add(DependencyInfo.builder()
                    .group(module)
                    .name(name)
                    .version(version)
                    .scope("COMPILE")
                    .build());
            }
        }

        log.debug("Parsed {} Go dependencies", deps.size());
        return deps;
    }

    // --- Helper methods ---

    private String mapGradleScope(String config) {
        return switch (config) {
            case "testImplementation", "testRuntimeOnly" -> "TEST";
            case "compileOnly", "annotationProcessor" -> "PROVIDED";
            case "runtimeOnly" -> "RUNTIME";
            default -> "COMPILE";
        };
    }

    private String resolveProperty(String value, Map<String, String> properties) {
        if (value == null) return null;
        Pattern varPattern = Pattern.compile("\\$\\{([^}]+)}");
        Matcher m = varPattern.matcher(value);
        StringBuilder sb = new StringBuilder();
        while (m.find()) {
            String resolved = properties.getOrDefault(m.group(1), m.group(0));
            m.appendReplacement(sb, Matcher.quoteReplacement(resolved));
        }
        m.appendTail(sb);
        return sb.toString();
    }

    private String extractXmlValue(String xml, String parentTag, String childTag) {
        Pattern p = Pattern.compile("<" + parentTag + ">[\\s\\S]*?<" + childTag + ">([^<]+)</" + childTag + ">[\\s\\S]*?</" + parentTag + ">");
        Matcher m = p.matcher(xml);
        return m.find() ? m.group(1).trim() : null;
    }

    private String extractTopLevelXmlTag(String xml, String tag) {
        // Match top-level <version> (not inside <parent> or <dependency>)
        Pattern p = Pattern.compile("<project[^>]*>[\\s\\S]*?<" + tag + ">([^<]+)</" + tag + ">");
        Matcher m = p.matcher(xml);
        if (m.find()) {
            String result = m.group(1).trim();
            // Make sure it's not inside <parent>
            String before = xml.substring(0, m.start(1));
            int lastParentOpen = before.lastIndexOf("<parent>");
            int lastParentClose = before.lastIndexOf("</parent>");
            if (lastParentOpen > lastParentClose) return null; // inside parent
            return result;
        }
        return null;
    }
}
