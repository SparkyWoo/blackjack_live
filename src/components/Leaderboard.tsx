"use client";

import { motion, AnimatePresence } from "framer-motion";

interface LeaderboardProps {
    isOpen: boolean;
    onClose: () => void;
    balances: Record<string, number>;
    adherence?: Record<string, number>;
    atmUsage?: Record<string, number>;
    blackjacks?: Record<string, number>;
}

export function Leaderboard({ isOpen, onClose, balances, adherence = {}, atmUsage = {}, blackjacks = {} }: LeaderboardProps) {
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

    // Get color class for adherence percentage
    const getAdherenceColor = (percent: number) => {
        if (percent >= 90) return "text-emerald-400";
        if (percent >= 70) return "text-yellow-400";
        return "text-red-400";
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

                        {/* Column headers */}
                        <div className="flex items-center px-5 py-2 text-xs text-white/40 border-b border-white/5">
                            <div className="w-8 text-center shrink-0">#</div>
                            <div className="flex-1 min-w-0 px-2">Player</div>
                            <div className="w-20 text-right shrink-0">Chips</div>
                            <div className="w-10 text-center shrink-0" title="Blackjacks">BJs</div>
                            <div className="w-12 text-right shrink-0">Strategy</div>
                            <div className="w-10 text-right shrink-0">ATM</div>
                        </div>

                        {/* Player list */}
                        <div className="max-h-[55vh] overflow-y-auto p-4 space-y-2">
                            {sortedPlayers.length === 0 ? (
                                <div className="text-center py-8 text-white/50">
                                    No players yet. Be the first to play!
                                </div>
                            ) : (
                                sortedPlayers.map(([name, chips], index) => {
                                    const playerAdherence = adherence[name];
                                    return (
                                        <motion.div
                                            key={name}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className={`flex items-center p-3 rounded-xl transition-colors
                                                        ${index < 3
                                                    ? "bg-gradient-to-r from-amber-500/15 to-transparent border border-amber-500/20"
                                                    : "bg-white/5 hover:bg-white/10"}`}
                                        >
                                            {/* Rank */}
                                            <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold shrink-0
                                                            ${index < 3 ? "text-lg" : "text-sm bg-white/10 text-white/60"}`}>
                                                {getTrophyIcon(index)}
                                            </div>

                                            {/* Name */}
                                            <div className="flex-1 min-w-0 px-2">
                                                <span className={`font-medium truncate block
                                                                ${index === 0 ? "text-amber-400" : "text-white"}`}>
                                                    {name}
                                                </span>
                                            </div>

                                            {/* Chips */}
                                            <div className="w-20 text-right shrink-0">
                                                <span className="text-emerald-400 font-bold">
                                                    ${chips.toLocaleString()}
                                                </span>
                                            </div>

                                            {/* Blackjacks - Silver Dollar Style */}
                                            <div className="w-10 flex justify-center shrink-0">
                                                {(blackjacks[name] ?? 0) > 0 ? (
                                                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-slate-300 via-slate-100 to-slate-400 
                                                                   border border-slate-400/50 shadow-sm 
                                                                   flex items-center justify-center text-[9px] font-bold text-slate-700"
                                                        title={`${blackjacks[name]} Blackjacks`}>
                                                        {blackjacks[name]}
                                                    </div>
                                                ) : (
                                                    <span className="text-white/30">—</span>
                                                )}
                                            </div>

                                            {/* Strategy Adherence */}
                                            <div className="w-12 text-right shrink-0">
                                                {playerAdherence !== undefined ? (
                                                    <span className={`font-medium ${getAdherenceColor(playerAdherence)}`}>
                                                        {playerAdherence}%
                                                    </span>
                                                ) : (
                                                    <span className="text-white/30">—</span>
                                                )}
                                            </div>

                                            {/* ATM Usage */}
                                            <div className="w-10 text-right font-mono text-sm shrink-0">
                                                <span className={atmUsage[name] && atmUsage[name] > 0
                                                    ? "text-orange-400"
                                                    : "text-white/30"}>
                                                    {atmUsage[name] || 0}
                                                </span>
                                            </div>
                                        </motion.div>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-3 border-t border-white/10 bg-black/30">
                            <p className="text-xs text-white/40 text-center">
                                Strategy % shows basic strategy adherence
                            </p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
