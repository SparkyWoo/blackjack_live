"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface TimerProps {
    endTime: number | null;
    maxMs: number;
    label?: string;
}

export function Timer({ endTime, maxMs, label }: TimerProps) {
    const [remaining, setRemaining] = useState(0);

    useEffect(() => {
        if (!endTime) {
            setRemaining(0);
            return;
        }

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

    if (!endTime || seconds <= 0) return null;

    return (
        <div className="flex items-center gap-2">
            {label && (
                <span className="text-xs text-amber-400/80 uppercase tracking-wide font-medium">
                    {label}
                </span>
            )}

            {/* Progress bar style */}
            <div className="relative w-16 h-5 bg-black/40 rounded overflow-hidden">
                <motion.div
                    className={`absolute inset-y-0 left-0 ${isLow ? "bg-red-500" : "bg-amber-500"}`}
                    style={{ width: `${progress * 100}%` }}
                    animate={isLow ? { opacity: [1, 0.5, 1] } : {}}
                    transition={{ duration: 0.5, repeat: Infinity }}
                />
                <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${isLow ? "text-white" : "text-black"
                    }`}>
                    {seconds}s
                </span>
            </div>
        </div>
    );
}
