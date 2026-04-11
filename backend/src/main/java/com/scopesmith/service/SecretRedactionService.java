package com.scopesmith.service;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class SecretRedactionService {

    private static final String PLACEHOLDER = "<REDACTED>";

    private static final Pattern PRIVATE_KEY_BLOCK = Pattern.compile(
            "-----BEGIN [A-Z ]*PRIVATE KEY-----[\\s\\S]*?-----END [A-Z ]*PRIVATE KEY-----",
            Pattern.CASE_INSENSITIVE
    );

    private static final Pattern AWS_ACCESS_KEY = Pattern.compile("AKIA[0-9A-Z]{16}");

    private static final Pattern BEARER_TOKEN = Pattern.compile(
            "(?i)Bearer\\s+[A-Za-z0-9\\-._~+/]+=*"
    );

    private static final Pattern URL_CREDENTIALS = Pattern.compile(
            "(https?://)([^\\s:@/]+):([^@\\s]+)@"
    );

    private static final List<Pattern> SENSITIVE_ASSIGNMENTS = List.of(
            Pattern.compile("(?im)^(\\s*[A-Za-z0-9_.-]*?(?:password|passwd|pwd)\\s*[:=]\\s*)([^\\r\\n]+)$"),
            Pattern.compile("(?im)^(\\s*[A-Za-z0-9_.-]*?(?:secret|client[_-]?secret)\\s*[:=]\\s*)([^\\r\\n]+)$"),
            Pattern.compile("(?im)^(\\s*[A-Za-z0-9_.-]*?(?:token|api[_-]?key|access[_-]?key)\\s*[:=]\\s*)([^\\r\\n]+)$")
    );

    public RedactionResult redact(String content) {
        if (content == null || content.isBlank()) {
            return new RedactionResult(content, 0);
        }

        String redacted = content;
        int total = 0;

        ReplacementResult keyBlock = replaceAllWithCounter(redacted, PRIVATE_KEY_BLOCK, "<REDACTED:PRIVATE_KEY>");
        redacted = keyBlock.text();
        total += keyBlock.count();

        ReplacementResult aws = replaceAllWithCounter(redacted, AWS_ACCESS_KEY, "<REDACTED:AWS_ACCESS_KEY>");
        redacted = aws.text();
        total += aws.count();

        ReplacementResult bearer = replaceAllWithCounter(redacted, BEARER_TOKEN, "Bearer <REDACTED:TOKEN>");
        redacted = bearer.text();
        total += bearer.count();

        ReplacementResult urlCred = replaceUrlCredentials(redacted);
        redacted = urlCred.text();
        total += urlCred.count();

        for (Pattern pattern : SENSITIVE_ASSIGNMENTS) {
            ReplacementResult assignment = replaceAssignmentValue(redacted, pattern);
            redacted = assignment.text();
            total += assignment.count();
        }

        return new RedactionResult(redacted, total);
    }

    private ReplacementResult replaceAllWithCounter(String input, Pattern pattern, String replacement) {
        Matcher matcher = pattern.matcher(input);
        if (!matcher.find()) {
            return new ReplacementResult(input, 0);
        }

        StringBuffer sb = new StringBuffer();
        int count = 0;
        do {
            count++;
            matcher.appendReplacement(sb, Matcher.quoteReplacement(replacement));
        } while (matcher.find());
        matcher.appendTail(sb);
        return new ReplacementResult(sb.toString(), count);
    }

    private ReplacementResult replaceAssignmentValue(String input, Pattern pattern) {
        Matcher matcher = pattern.matcher(input);
        if (!matcher.find()) {
            return new ReplacementResult(input, 0);
        }

        StringBuffer sb = new StringBuffer();
        int count = 0;
        do {
            count++;
            String prefix = matcher.group(1);
            matcher.appendReplacement(sb, Matcher.quoteReplacement(prefix + PLACEHOLDER));
        } while (matcher.find());
        matcher.appendTail(sb);
        return new ReplacementResult(sb.toString(), count);
    }

    private ReplacementResult replaceUrlCredentials(String input) {
        Matcher matcher = URL_CREDENTIALS.matcher(input);
        if (!matcher.find()) {
            return new ReplacementResult(input, 0);
        }

        StringBuffer sb = new StringBuffer();
        int count = 0;
        do {
            count++;
            String replacement = matcher.group(1) + "<REDACTED>:<REDACTED>@";
            matcher.appendReplacement(sb, Matcher.quoteReplacement(replacement));
        } while (matcher.find());
        matcher.appendTail(sb);
        return new ReplacementResult(sb.toString(), count);
    }

    private record ReplacementResult(String text, int count) {}

    public record RedactionResult(String content, int redactionCount) {}
}
