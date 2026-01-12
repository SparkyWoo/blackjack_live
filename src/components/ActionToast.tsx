"use client";

import { useEffect, useState, useRef } from "react";
import { LazyMotion, domAnimation, m, AnimatePresence } from "framer-motion";

interface ActionToastProps {
    action: {
        playerId: string;
        action: string;
        seatIndex: number;
    } | null;
    playerName: string;
    gamePhase?: string;
}

interface ActionEntry {
    id: string;
    action: string;
    playerName: string;
    timestamp: number;
}

const ACTION_CONFIG: Record<string, { emoji: string; color: string; label: string }> = {
    hit: { emoji: "👆", color: "from-blue-500 to-blue-600", label: "HIT" },
    stand: { emoji: "✋", color: "from-amber-500 to-amber-600", label: "STAND" },
    double: { emoji: "⚡", color: "from-purple-500 to-purple-600", label: "DOUBLE" },
    split: { emoji: "✂️", color: "from-pink-500 to-pink-600", label: "SPLIT" },
    surrender: { emoji: "🏳️", color: "from-gray-500 to-gray-600", label: "SURRENDER" },
};

const MAX_ACTIONS = 5;

export function ActionToast({ action, playerName, gamePhase }: ActionToastProps) {
    const [actionHistory, setActionHistory] = useState<ActionEntry[]>([]);
    const prevPhaseRef = useRef<string | undefined>(undefined);

    // Clear actions when entering betting or dealing phase (new round)
    useEffect(() => {
        if (gamePhase && prevPhaseRef.current !== gamePhase) {
            if (gamePhase === "betting" || gamePhase === "dealing") {
                setActionHistory([]);
            }
            prevPhaseRef.current = gamePhase;
        }
    }, [gamePhase]);

    // Add new actions to history
    useEffect(() => {
        if (action && playerName) {
            const newEntry: ActionEntry = {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                action: action.action,
                playerName,
                timestamp: Date.now(),
            };

            setActionHistory(prev => {
                const updated = [newEntry, ...prev];
                // Limit to MAX_ACTIONS
                return updated.slice(0, MAX_ACTIONS);
            });
        }
    }, [action, playerName]);

    return (
        <LazyMotion features={domAnimation}>
            <div className="fixed left-4 top-20 z-50 pointer-events-none flex flex-col gap-2">
                <AnimatePresence>
                    {actionHistory.map((entry, index) => {
                        const config = ACTION_CONFIG[entry.action];
                        if (!config) return null;

                        return (
                            <m.div
                                key={entry.id}
                                initial={{ opacity: 0, x: -50, scale: 0.8 }}
                                animate={{
                                    opacity: index === 0 ? 1 : 0.6 - (index * 0.1),
                                    x: 0,
                                    scale: 1 - (index * 0.05)
                                }}
                                exit={{ opacity: 0, x: -30, scale: 0.8 }}
                                transition={{ type: "spring", damping: 20, stiffness: 300 }}
                            >
                                <m.div
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r ${config.color}
                                                shadow-lg shadow-black/30 border border-white/20`}
                                    style={{
                                        fontSize: index === 0 ? undefined : '0.85em'
                                    }}
                                >
                                    {/* Emoji */}
                                    <span className="text-base">{config.emoji}</span>

                                    {/* Player name and action */}
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-white/80 text-xs font-medium truncate max-w-[60px]">
                                            {entry.playerName}
                                        </span>
                                        <span className="text-white font-bold text-xs tracking-wide">
                                            {config.label}
                                        </span>
                                    </div>
                                </m.div>
                            </m.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </LazyMotion>
    );
}
