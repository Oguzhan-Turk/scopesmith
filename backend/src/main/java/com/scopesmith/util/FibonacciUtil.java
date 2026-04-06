package com.scopesmith.util;

import java.util.Comparator;
import java.util.List;

public final class FibonacciUtil {
    private static final List<Integer> FIBONACCI_SP = List.of(1, 2, 3, 5, 8, 13, 21);

    private FibonacciUtil() {}

    public static int nearestFibonacci(int value) {
        if (value <= 0) return 1;
        if (value > 21) return 21;
        return FIBONACCI_SP.stream()
            .min(Comparator.comparingInt(f -> Math.abs(f - value)))
            .orElse(value);
    }

    public static boolean isFibonacci(int value) {
        return FIBONACCI_SP.contains(value);
    }
}
