"use client";

import { LazyMotion, domAnimation, m } from "framer-motion";
import { useEffect } from "react";

interface StrategyModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function StrategyModal({ isOpen, onClose }: StrategyModalProps) {
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
                    className="relative max-w-2xl w-full max-h-[90vh] bg-gradient-to-b from-gray-900 to-gray-950 
                               rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">📊</span>
                            <div>
                                <h2 className="text-white font-bold text-lg">Basic Strategy Chart</h2>
                                <p className="text-white/50 text-xs">Double-Deck, Dealer Stands on Soft 17</p>
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

                    {/* Chart Image */}
                    <div className="p-4 overflow-auto max-h-[70vh]" style={{ touchAction: "pinch-zoom" }}>
                        <img
                            src="/basic-strategy-chart.png"
                            alt="Basic Strategy Chart"
                            className="w-full h-auto rounded-lg"
                        />
                    </div>

                    {/* Legend */}
                    <div className="px-6 py-3 border-t border-white/10 bg-black/30">
                        <div className="flex flex-wrap gap-3 text-xs text-white/70">
                            <span><span className="inline-block w-3 h-3 bg-green-500 rounded mr-1"></span> Hit</span>
                            <span><span className="inline-block w-3 h-3 bg-red-500 rounded mr-1"></span> Stand</span>
                            <span><span className="inline-block w-3 h-3 bg-yellow-500 rounded mr-1"></span> Double</span>
                            <span><span className="inline-block w-3 h-3 bg-blue-500 rounded mr-1"></span> Split</span>
                            <span className="text-white/40">Press ESC to close</span>
                        </div>
                    </div>
                </m.div>
            </m.div>
        </LazyMotion>
    );
}
