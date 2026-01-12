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
                        initial={{ opacity: 0, y: -50, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.9 }}
                        transition={{ type: "spring", damping: 20, stiffness: 300 }}
                        className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
                    >
                        <m.div
                            className={`flex items-center gap-3 px-5 py-3 rounded-2xl bg-gradient-to-r ${config.color}
                                        shadow-2xl shadow-black/40 border border-white/20`}
                            initial={{ rotate: -2 }}
                            animate={{ rotate: [0, -1, 1, 0] }}
                            transition={{ duration: 0.3, delay: 0.1 }}
                        >
                            {/* Emoji with pulse */}
                            <m.span
                                className="text-2xl"
                                animate={{ scale: [1, 1.3, 1] }}
                                transition={{ duration: 0.3 }}
                            >
                                {config.emoji}
                            </m.span>

                            {/* Player name and action */}
                            <div className="flex flex-col">
                                <span className="text-white/80 text-xs font-medium truncate max-w-[120px]">
                                    {playerName}
                                </span>
                                <m.span
                                    className="text-white font-black text-lg tracking-wide"
                                    initial={{ x: -10, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.1 }}
                                >
                                    {config.label}
                                </m.span>
                            </div>

                            {/* Seat indicator */}
                            <div className="ml-2 w-8 h-8 rounded-full bg-black/20 flex items-center justify-center">
                                <span className="text-white/90 text-sm font-bold">
                                    #{currentAction.seatIndex + 1}
                                </span>
                            </div>
                        </m.div>

                        {/* Subtle glow effect */}
                        <m.div
                            className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${config.color} blur-xl opacity-30 -z-10`}
                            animate={{ opacity: [0.2, 0.4, 0.2] }}
                            transition={{ duration: 1, repeat: Infinity }}
                        />
                    </m.div>
                )}
            </AnimatePresence>
        </LazyMotion>
    );
}
