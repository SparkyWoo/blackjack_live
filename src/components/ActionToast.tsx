"use client";

import { useEffect, useState } from "react";
import { LazyMotion, domAnimation, m, AnimatePresence } from "framer-motion";

interface ActionToastProps {
    action: {
        playerId: string;
        action: string;
        seatIndex: number;
    } | null;
    playerName: string;
}

const ACTION_CONFIG: Record<string, { emoji: string; color: string; label: string }> = {
    hit: { emoji: "👆", color: "from-blue-500 to-blue-600", label: "HIT" },
    stand: { emoji: "✋", color: "from-amber-500 to-amber-600", label: "STAND" },
    double: { emoji: "⚡", color: "from-purple-500 to-purple-600", label: "DOUBLE" },
    split: { emoji: "✂️", color: "from-pink-500 to-pink-600", label: "SPLIT" },
    surrender: { emoji: "🏳️", color: "from-gray-500 to-gray-600", label: "SURRENDER" },
};

export function ActionToast({ action, playerName }: ActionToastProps) {
    const [visible, setVisible] = useState(false);
    const [currentAction, setCurrentAction] = useState<typeof action>(null);

    useEffect(() => {
        if (action) {
            setCurrentAction(action);
            setVisible(true);

            // Auto-hide after 1.5 seconds
            const timer = setTimeout(() => {
                setVisible(false);
            }, 1500);

            return () => clearTimeout(timer);
        }
    }, [action]);

    const config = currentAction ? ACTION_CONFIG[currentAction.action] : null;

    return (
        <LazyMotion features={domAnimation}>
            <AnimatePresence>
                {visible && currentAction && config && (
                    <m.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -30 }}
                        transition={{ type: "spring", damping: 20, stiffness: 300 }}
                        className="fixed left-4 top-20 z-50 pointer-events-none"
                    >
                        <m.div
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r ${config.color}
                                        shadow-lg shadow-black/30 border border-white/20`}
                        >
                            {/* Emoji */}
                            <span className="text-lg">{config.emoji}</span>

                            {/* Player name and action */}
                            <div className="flex items-center gap-1.5">
                                <span className="text-white/80 text-xs font-medium truncate max-w-[80px]">
                                    {playerName}
                                </span>
                                <span className="text-white font-bold text-sm tracking-wide">
                                    {config.label}
                                </span>
                            </div>
                        </m.div>
                    </m.div>
                )}
            </AnimatePresence>
        </LazyMotion>
    );
}
