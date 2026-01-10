"use client";

import { motion } from "framer-motion";

export type ChipValue = 10 | 50 | 100 | 500 | 1000;

interface ChipProps {
    value: ChipValue;
    onClick?: () => void;
    disabled?: boolean;
    selected?: boolean;
    size?: "sm" | "md";
}

const chipStyles: Record<ChipValue, { bg: string; ring: string; edge: string; text: string }> = {
    10: { bg: "#2563eb", ring: "#60a5fa", edge: "#1d4ed8", text: "#fff" },
    50: { bg: "#16a34a", ring: "#4ade80", edge: "#15803d", text: "#fff" },
    100: { bg: "#171717", ring: "#525252", edge: "#0a0a0a", text: "#fff" },
    500: { bg: "#9333ea", ring: "#c084fc", edge: "#7e22ce", text: "#fff" },
    1000: { bg: "#ea580c", ring: "#fb923c", edge: "#c2410c", text: "#fff" },
};

export function Chip({ value, onClick, disabled = false, selected = false, size = "md" }: ChipProps) {
    const styles = chipStyles[value];
    const dims = size === "sm" ? "w-11 h-11" : "w-14 h-14";
    const fontSize = size === "sm" ? "text-[11px]" : "text-sm";

    return (
        <motion.button
            whileHover={disabled ? {} : { scale: 1.12, y: -4, rotate: 5 }}
            whileTap={disabled ? {} : { scale: 0.92 }}
            onClick={onClick}
            disabled={disabled}
            className={`${dims} rounded-full font-bold relative transition-all duration-200
                ${disabled ? "opacity-30 cursor-not-allowed grayscale" : "cursor-pointer"}
                ${selected ? "ring-3 ring-yellow-400 ring-offset-2 ring-offset-green-900" : ""}
            `}
            style={{
                background: `radial-gradient(circle at 35% 35%, ${styles.ring}, ${styles.bg} 60%, ${styles.edge})`,
                boxShadow: disabled
                    ? "none"
                    : `0 4px 12px rgba(0,0,0,0.5), 
                       0 2px 4px rgba(0,0,0,0.3),
                       inset 0 2px 4px rgba(255,255,255,0.25),
                       inset 0 -2px 4px rgba(0,0,0,0.2)`,
            }}
        >
            {/* Outer ring */}
            <div
                className="absolute inset-1 rounded-full"
                style={{
                    border: `2px solid ${styles.ring}40`,
                }}
            />

            {/* Inner ring pattern */}
            <div
                className="absolute inset-2 rounded-full border border-dashed"
                style={{ borderColor: `${styles.ring}50` }}
            />

            {/* Edge dots */}
            <div className="absolute inset-0 flex items-center justify-center">
                {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
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
                style={{
                    color: styles.text,
                    textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                }}
            >
                {value >= 1000 ? "1K" : value}
            </span>

            {/* Shine effect */}
            <div
                className="absolute inset-0 rounded-full pointer-events-none overflow-hidden"
                style={{
                    background: "linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%)",
                }}
            />
        </motion.button>
    );
}

interface BetDisplayProps {
    amount: number;
    compact?: boolean;
}

export function BetDisplay({ amount, compact = false }: BetDisplayProps) {
    if (amount === 0) return null;

    // Determine chip color based on bet amount
    const getChipColor = () => {
        if (amount >= 1000) return { bg: "#ea580c", ring: "#fb923c" };
        if (amount >= 500) return { bg: "#9333ea", ring: "#c084fc" };
        if (amount >= 100) return { bg: "#171717", ring: "#525252" };
        if (amount >= 50) return { bg: "#16a34a", ring: "#4ade80" };
        return { bg: "#2563eb", ring: "#60a5fa" };
    };

    const colors = getChipColor();

    return (
        <motion.div
            initial={{ scale: 0, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className={`flex items-center justify-center ${compact ? "gap-1.5" : "gap-2"}`}
        >
            {/* Chip stack visual */}
            <div className="relative">
                {[0, 1, 2].map((i) => (
                    <div
                        key={i}
                        className={`${compact ? "w-5 h-5" : "w-7 h-7"} rounded-full absolute`}
                        style={{
                            background: `radial-gradient(circle at 35% 35%, ${colors.ring}, ${colors.bg})`,
                            boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                            top: -i * 2,
                            left: 0,
                            zIndex: 3 - i,
                        }}
                    />
                ))}
                <div className={`${compact ? "w-5 h-5" : "w-7 h-7"}`} />
            </div>

            <span className={`font-bold text-amber-400 ${compact ? "text-sm" : "text-base"} drop-shadow-md`}>
                ${amount.toLocaleString()}
            </span>
        </motion.div>
    );
}
