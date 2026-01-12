"use client";

import { LazyMotion, domAnimation, m } from "framer-motion";

interface TrueCountDisplayProps {
    isVisible: boolean;
    onClose: () => void;
    runningCount: number;
    cardsRemaining: number;
}

export function TrueCountDisplay({ isVisible, onClose, runningCount, cardsRemaining }: TrueCountDisplayProps) {
    if (!isVisible) return null;

    const decksRemaining = Math.max(cardsRemaining / 52, 0.5);
    const trueCount = runningCount / decksRemaining;

    // Color based on advantage
    const getAdvantageColor = () => {
        if (trueCount >= 2) return "text-emerald-400";
        if (trueCount <= -2) return "text-red-400";
        return "text-white";
    };

    return (
        <LazyMotion features={domAnimation}>
            <m.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="fixed top-20 right-4 z-30 pointer-events-auto"
            >
                <div className="bg-black/80 backdrop-blur-sm rounded-xl border border-white/10 p-3 shadow-lg min-w-[140px]">
                    {/* Header with close button */}
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-white/60">🔢 Count</span>
                        <button
                            onClick={onClose}
                            className="text-white/40 hover:text-white text-xs p-1 -m-1"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Running Count */}
                    <div className="flex justify-between items-center text-xs mb-1">
                        <span className="text-white/50">Running:</span>
                        <span className={runningCount > 0 ? "text-emerald-400 font-bold" : runningCount < 0 ? "text-red-400 font-bold" : "text-white font-bold"}>
                            {runningCount > 0 ? "+" : ""}{runningCount}
                        </span>
                    </div>

                    {/* Decks Remaining */}
                    <div className="flex justify-between items-center text-xs mb-1">
                        <span className="text-white/50">Decks:</span>
                        <span className="text-white font-medium">{decksRemaining.toFixed(1)}</span>
                    </div>

                    {/* True Count - highlighted */}
                    <div className="flex justify-between items-center text-sm mt-2 pt-2 border-t border-white/10">
                        <span className="text-white/70 font-medium">True:</span>
                        <span className={`font-black text-lg ${getAdvantageColor()}`}>
                            {trueCount > 0 ? "+" : ""}{trueCount.toFixed(1)}
                        </span>
                    </div>

                    {/* Legend */}
                    <div className="text-[10px] text-white/30 mt-2 text-center">
                        <span className="text-emerald-400/60">2-6:+1</span>
                        <span className="mx-1">7-9:0</span>
                        <span className="text-red-400/60">10-A:-1</span>
                    </div>
                </div>
            </m.div>
        </LazyMotion>
    );
}
