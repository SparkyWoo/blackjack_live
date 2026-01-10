// Haptic feedback utility with feature detection
// Uses the Vibration API for mobile devices

type HapticPattern = "light" | "medium" | "heavy" | "success" | "error";

const patterns: Record<HapticPattern, number | number[]> = {
    light: 10,
    medium: 20,
    heavy: 30,
    success: [10, 50, 20],
    error: [30, 50, 30],
};

/**
 * Trigger haptic feedback on supported devices
 * @param pattern - The vibration pattern to use
 * @returns true if haptic was triggered, false if not supported
 */
export function haptic(pattern: HapticPattern = "light"): boolean {
    // Check if vibration API is supported
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
            return navigator.vibrate(patterns[pattern]);
        } catch {
            // Silently fail if vibration fails
            return false;
        }
    }
    return false;
}

/**
 * Check if haptic feedback is available on this device
 */
export function isHapticSupported(): boolean {
    return typeof navigator !== "undefined" && "vibrate" in navigator;
}
