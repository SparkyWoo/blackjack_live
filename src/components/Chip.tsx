"use client";

import { memo, useMemo, useCallback } from "react";
import { LazyMotion, domAnimation, m } from "framer-motion";
import { haptic } from "@/lib/haptics";

export type ChipValue = 10 | 50 | 100 | 500 | 1000;

interface ChipProps {
    value: ChipValue;
    onClick?: () => void;
    disabled?: boolean;
    selected?: boolean;
    size?: "sm" | "md";
}

// Hoisted static styles for chip colors - avoids recreation on each render
const chipStyles: Record<ChipValue, { bg: string; ring: string; edge: string; text: string }> = {
    10: { bg: "#2563eb", ring: "#60a5fa", edge: "#1d4ed8", text: "#fff" },
    50: { bg: "#16a34a", ring: "#4ade80", edge: "#15803d", text: "#fff" },
    100: { bg: "#171717", ring: "#525252", edge: "#0a0a0a", text: "#fff" },
    500: { bg: "#9333ea", ring: "#c084fc", edge: "#7e22ce", text: "#fff" },
    1000: { bg: "#ea580c", ring: "#fb923c", edge: "#c2410c", text: "#fff" },
};

// Hoisted animation variants
const hoverAnimation = { scale: 1.12, y: -4, rotate: 5 };
const tapAnimation = { scale: 0.92 };
const emptyAnimation = {};

// Edge dot angles - hoisted to avoid array recreation
const edgeDotAngles = [0, 45, 90, 135, 180, 225, 270, 315];

// Shine effect style - hoisted outside component
const shineStyle = {
    background: "linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%)",
};

function ChipComponent({ value, onClick, disabled = false, selected = false, size = "md" }: ChipProps) {
    const styles = chipStyles[value];
    // Larger touch targets for mobile - 44px minimum recommended for accessibility
    const dims = size === "sm" ? "w-12 h-12 min-w-[48px] min-h-[48px]" : "w-16 h-16 min-w-[64px] min-h-[64px]";
    const fontSize = size === "sm" ? "text-xs" : "text-base";

    const handleClick = useCallback(() => {
        if (!disabled && onClick) {
            haptic("light");
            onClick();
        }
    }, [disabled, onClick]);

    // Memoize computed styles
    const chipStyle = useMemo(() => ({
        background: `radial-gradient(circle at 35% 35%, ${styles.ring}, ${styles.bg} 60%, ${styles.edge})`,
        boxShadow: disabled
            ? "none"
            : `0 4px 12px rgba(0,0,0,0.5), 
               0 2px 4px rgba(0,0,0,0.3),
               inset 0 2px 4px rgba(255,255,255,0.25),
               inset 0 -2px 4px rgba(0,0,0,0.2)`,
    }), [styles, disabled]);

    const outerRingStyle = useMemo(() => ({
        border: `2px solid ${styles.ring}40`,
    }), [styles.ring]);

    const innerRingStyle = useMemo(() => ({
        borderColor: `${styles.ring}50`,
    }), [styles.ring]);

    const textStyle = useMemo(() => ({
        color: styles.text,
        textShadow: "0 1px 2px rgba(0,0,0,0.3)",
    }), [styles.text]);

    return (
        <LazyMotion features={domAnimation}>
            <m.button
                whileHover={disabled ? emptyAnimation : hoverAnimation}
                whileTap={disabled ? emptyAnimation : tapAnimation}
                onClick={handleClick}
                disabled={disabled}
                className={`${dims} rounded-full font-bold relative transition-all duration-200
                    ${disabled ? "opacity-30 cursor-not-allowed grayscale" : "cursor-pointer"}
                    ${selected ? "ring-3 ring-yellow-400 ring-offset-2 ring-offset-green-900" : ""}
                `}
                style={chipStyle}
            >
                {/* Outer ring */}
                <div className="absolute inset-1 rounded-full" style={outerRingStyle} />

                {/* Inner ring pattern */}
                <div
                    className="absolute inset-2 rounded-full border border-dashed"
                    style={innerRingStyle}
                />

                {/* Edge dots */}
                <div className="absolute inset-0 flex items-center justify-center">
                    {edgeDotAngles.map((deg) => (
                        <div
                            key={deg}
                            className="absolute rounded-full"
                            style={{
                                width: size === "sm" ? 3 : 4,
                                height: size === "sm" ? 3 : 4,
                                backgroundColor: styles.ring,
                                transform: `rotate(${deg}deg) translateY(-${size === "sm" ? 17 : 22}px)`,
                                boxShadow: `0 0 3px ${styles.ring}`,
                            }}
                        />
                    ))}
                </div>

                {/* Value */}
                <span
                    className={`${fontSize} font-bold relative z-10 drop-shadow-md`}
                    style={textStyle}
                >
                    {value >= 1000 ? "1K" : value}
                </span>

                {/* Shine effect */}
                <div
                    className="absolute inset-0 rounded-full pointer-events-none overflow-hidden"
                    style={shineStyle}
                />
            </m.button>
        </LazyMotion>
    );
}

// Memoized Chip component
export const Chip = memo(ChipComponent);

interface BetDisplayProps {
    amount: number;
    compact?: boolean;
}

// BetDisplay animation - hoisted
const betDisplayTransition = { type: "spring" as const, stiffness: 400, damping: 20 };

function BetDisplayComponent({ amount, compact = false }: BetDisplayProps) {
    if (amount === 0) return null;

    // Memoize chip colors based on amount
    const colors = useMemo(() => {
        if (amount >= 1000) return { bg: "#ea580c", ring: "#fb923c" };
        if (amount >= 500) return { bg: "#9333ea", ring: "#c084fc" };
        if (amount >= 100) return { bg: "#171717", ring: "#525252" };
        if (amount >= 50) return { bg: "#16a34a", ring: "#4ade80" };
        return { bg: "#2563eb", ring: "#60a5fa" };
    }, [amount]);

    // Calculate number of chip layers based on bet amount
    const chipCount = useMemo(() => {
        if (amount >= 1000) return 5;
        if (amount >= 500) return 4;
        if (amount >= 100) return 3;
        return 2;
    }, [amount]);

    // Memoize stack chip styles with dynamic count
    const chipStackStyles = useMemo(() =>
        Array.from({ length: chipCount }, (_, i) => ({
            background: `radial-gradient(circle at 35% 35%, ${colors.ring}, ${colors.bg})`,
            boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
            top: -i * 3,
            left: i % 2 === 0 ? 0 : 1,
            zIndex: chipCount - i,
        })),
        [colors, chipCount]
    );

    return (
        <LazyMotion features={domAnimation}>
            <m.div
                initial={{ scale: 0, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                transition={betDisplayTransition}
                className={`flex items-center justify-center ${compact ? "gap-1.5" : "gap-2"}`}
            >
                {/* Chip stack visual with staggered animation */}
                <div className="relative">
                    {chipStackStyles.map((style, i) => (
                        <m.div
                            key={i}
                            initial={{ scale: 0, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            transition={{ delay: i * 0.05, type: "spring", stiffness: 400 }}
                            className={`${compact ? "w-5 h-5" : "w-7 h-7"} rounded-full absolute`}
                            style={style}
                        />
                    ))}
                    <div className={`${compact ? "w-5 h-5" : "w-7 h-7"}`} />
                </div>

                <span className={`font-bold text-amber-400 ${compact ? "text-sm" : "text-base"} drop-shadow-md`}>
                    ${amount.toLocaleString()}
                </span>
            </m.div>
        </LazyMotion>
    );
}

// Memoized BetDisplay component
export const BetDisplay = memo(BetDisplayComponent);
