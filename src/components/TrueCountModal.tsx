"use client";

import { LazyMotion, domAnimation, m } from "framer-motion";
import { useEffect } from "react";

interface TrueCountModalProps {
    isOpen: boolean;
    onClose: () => void;
    runningCount: number;
    cardsRemaining: number;
}

export function TrueCountModal({ isOpen, onClose, runningCount, cardsRemaining }: TrueCountModalProps) {
    // ESC key to close
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
            }
        };

        if (isOpen) {
            window.addEventListener("keydown", handleKeyDown);
            return () => window.removeEventListener("keydown", handleKeyDown);
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const decksRemaining = Math.max(cardsRemaining / 52, 0.5); // Minimum 0.5 to avoid division issues
    const trueCount = runningCount / decksRemaining;

    // Color based on advantage: green = player advantage, red = house advantage
    const getAdvantageColor = () => {
        if (trueCount >= 2) return "text-emerald-400";
        if (trueCount <= -2) return "text-red-400";
        return "text-white";
    };

    const getAdvantageText = () => {
        if (trueCount >= 2) return "Player Advantage 🎯";
        if (trueCount <= -2) return "House Advantage ⚠️";
        return "Neutral";
    };

    return (
        <LazyMotion features={domAnimation}>
            <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <m.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-sm bg-gradient-to-b from-gray-900 to-gray-950 
                               rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">🔢</span>
                            <div>
                                <h2 className="text-white font-bold text-lg">Card Count</h2>
                                <p className="text-white/50 text-xs">Hi-Lo System</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Count Display */}
                    <div className="p-6 space-y-6">
                        {/* Running Count */}
                        <div className="text-center">
                            <div className="text-white/50 text-sm mb-1">Running Count</div>
                            <div className={`text-4xl font-bold ${runningCount > 0 ? "text-emerald-400" : runningCount < 0 ? "text-red-400" : "text-white"}`}>
                                {runningCount > 0 ? "+" : ""}{runningCount}
                            </div>
                        </div>

                        {/* Decks Remaining */}
                        <div className="text-center">
                            <div className="text-white/50 text-sm mb-1">Decks Remaining</div>
                            <div className="text-2xl font-semibold text-white">
                                {decksRemaining.toFixed(1)}
                            </div>
                        </div>

                        {/* True Count */}
                        <div className="text-center p-4 bg-white/5 rounded-xl border border-white/10">
                            <div className="text-white/50 text-sm mb-1">True Count</div>
                            <div className={`text-5xl font-black ${getAdvantageColor()}`}>
                                {trueCount > 0 ? "+" : ""}{trueCount.toFixed(1)}
                            </div>
                            <div className={`text-sm mt-2 ${getAdvantageColor()}`}>
                                {getAdvantageText()}
                            </div>
                        </div>

                        {/* Formula */}
                        <div className="text-center text-xs text-white/40">
                            True Count = Running Count ÷ Decks Remaining
                        </div>
                    </div>

                    {/* Hi-Lo Legend */}
                    <div className="px-6 py-3 border-t border-white/10 bg-black/30">
                        <div className="text-xs text-white/50 text-center">
                            <span className="text-emerald-400">2-6: +1</span>
                            <span className="mx-3 text-white/30">7-9: 0</span>
                            <span className="text-red-400">10-A: -1</span>
                        </div>
                    </div>
                </m.div>
            </m.div>
        </LazyMotion>
    );
}
