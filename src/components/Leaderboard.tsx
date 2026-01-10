"use client";

import { motion, AnimatePresence } from "framer-motion";

interface LeaderboardProps {
    isOpen: boolean;
    onClose: () => void;
    balances: Record<string, number>;
}

export function Leaderboard({ isOpen, onClose, balances }: LeaderboardProps) {
    // Sort players by chip count (highest first)
    const sortedPlayers = Object.entries(balances)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 20); // Top 20

    const getTrophyIcon = (rank: number) => {
        switch (rank) {
            case 0: return "🥇";
            case 1: return "🥈";
            case 2: return "🥉";
            default: return `${rank + 1}`;
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50
                                   w-[90vw] max-w-md bg-gradient-to-b from-gray-900 to-gray-950
                                   rounded-2xl shadow-2xl border border-amber-500/20 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10
                                        bg-gradient-to-r from-amber-500/10 to-transparent">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">🏆</span>
                                <h2 className="text-xl font-bold text-amber-400">Leaderboard</h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 flex items-center justify-center rounded-full
                                           bg-white/5 hover:bg-white/10 transition-colors text-white/60 hover:text-white"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Player list */}
                        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-2">
                            {sortedPlayers.length === 0 ? (
                                <div className="text-center py-8 text-white/50">
                                    No players yet. Be the first to play!
                                </div>
                            ) : (
                                sortedPlayers.map(([name, chips], index) => (
                                    <motion.div
                                        key={name}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className={`flex items-center gap-3 p-3 rounded-xl transition-colors
                                                    ${index < 3
                                                ? "bg-gradient-to-r from-amber-500/15 to-transparent border border-amber-500/20"
                                                : "bg-white/5 hover:bg-white/10"}`}
                                    >
                                        {/* Rank */}
                                        <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold
                                                        ${index < 3 ? "text-lg" : "text-sm bg-white/10 text-white/60"}`}>
                                            {getTrophyIcon(index)}
                                        </div>

                                        {/* Name */}
                                        <div className="flex-1 min-w-0">
                                            <span className={`font-medium truncate block
                                                            ${index === 0 ? "text-amber-400" : "text-white"}`}>
                                                {name}
                                            </span>
                                        </div>

                                        {/* Chips */}
                                        <div className="flex items-center gap-2">
                                            <span className="text-emerald-400 font-bold">
                                                ${chips.toLocaleString()}
                                            </span>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-3 border-t border-white/10 bg-black/30">
                            <p className="text-xs text-white/40 text-center">
                                All chip balances are tracked across sessions
                            </p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
