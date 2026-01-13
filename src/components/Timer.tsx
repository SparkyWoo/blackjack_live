"use client";

import { useEffect, useState, memo, useMemo } from "react";
import { LazyMotion, domAnimation, m } from "framer-motion";

interface TimerProps {
    endTime: number | null;
    maxMs: number;
    label?: string;
}

// Animation for low time warning
const lowTimeAnimation = { opacity: [1, 0.5, 1] };
const lowTimeTransition = { duration: 0.5, repeat: Infinity };

function TimerComponent({ endTime, maxMs, label }: TimerProps) {
    // Initialize with computed value to avoid setState in effect
    const [remaining, setRemaining] = useState(() =>
        endTime ? Math.max(0, endTime - Date.now()) : 0
    );

    useEffect(() => {
        if (!endTime) return;

        const update = () => {
            const now = Date.now();
            const left = Math.max(0, endTime - now);
            setRemaining(left);
        };

        update();
        const interval = setInterval(update, 100);
        return () => clearInterval(interval);
    }, [endTime]);

    const seconds = Math.ceil(remaining / 1000);
    const progress = remaining / maxMs;
    const isLow = seconds <= 5 && seconds > 0;

    // Memoize width style
    const progressStyle = useMemo(() => ({ width: `${progress * 100}%` }), [progress]);

    if (!endTime || seconds <= 0) return null;

    return (
        <LazyMotion features={domAnimation}>
            <div className="flex items-center gap-2">
                {label && (
                    <span className="text-xs text-amber-400/80 uppercase tracking-wide font-medium">
                        {label}
                    </span>
                )}

                {/* Progress bar style */}
                <div className="relative w-16 h-5 bg-black/40 rounded overflow-hidden">
                    <m.div
                        className={`absolute inset-y-0 left-0 ${isLow ? "bg-red-500" : "bg-amber-500"}`}
                        style={progressStyle}
                        animate={isLow ? lowTimeAnimation : undefined}
                        transition={isLow ? lowTimeTransition : undefined}
                    />
                    <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${isLow ? "text-white" : "text-black"
                        }`}>
                        {seconds}s
                    </span>
                </div>
            </div>
        </LazyMotion>
    );
}

// Memoized Timer - only re-renders when endTime or maxMs changes
export const Timer = memo(TimerComponent);
