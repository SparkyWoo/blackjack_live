"use client";

import { useState, useMemo, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Seat as SeatType, calculateHandValue } from "@/lib/gameTypes";
import { CardStack } from "./Card";
import { BetDisplay } from "./Chip";

interface SeatProps {
    seat: SeatType;
    seatIndex: number;
    isCurrentPlayer: boolean;
    isActivePlayer: boolean;
    activeHandIndex: number;
    payout?: {
        amount: number;
        result: 'win' | 'lose' | 'push' | 'blackjack';
    };
    showPayout?: boolean;
    onJoin: (name: string) => void;
}

function SeatComponent({
    seat,
    seatIndex,
    isCurrentPlayer,
    isActivePlayer,
    activeHandIndex,
    payout,
    showPayout,
    onJoin,
}: SeatProps) {
    const [showJoinInput, setShowJoinInput] = useState(false);
    const [nameInput, setNameInput] = useState("");

    const isEmpty = seat.playerId === null;

    // Memoize hand values calculation - expensive operation
    const handValues = useMemo(() =>
        seat.hands.map((hand) => {
            const { value, isSoft } = calculateHandValue(hand.cards);
            return { value, isSoft, status: hand.status };
        }),
        [seat.hands]
    );

    // Memoized handlers for join input
    const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && nameInput.trim()) {
            onJoin(nameInput.trim());
            setShowJoinInput(false);
        } else if (e.key === "Escape") {
            setShowJoinInput(false);
            setNameInput("");
        }
    }, [nameInput, onJoin]);

    const handleJoinClick = useCallback(() => {
        if (nameInput.trim()) {
            onJoin(nameInput.trim());
            setShowJoinInput(false);
        }
    }, [nameInput, onJoin]);

    const handleCancelClick = useCallback(() => {
        setShowJoinInput(false);
        setNameInput("");
    }, []);

    // Empty seat - show join option
    if (isEmpty) {
        return (
            <motion.div
                className="flex flex-col items-center gap-2"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: seatIndex * 0.05 }}
            >
                {/* Empty seat spot */}
                <motion.div
                    whileHover={{ scale: 1.08, y: -3 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => !showJoinInput && setShowJoinInput(true)}
                    className="relative cursor-pointer group"
                >
                    {/* Seat base */}
                    <div className="w-20 h-16 rounded-xl border-2 border-dashed border-white/15 
                                    flex items-center justify-center
                                    bg-gradient-to-b from-white/5 to-transparent
                                    group-hover:border-amber-400/50 group-hover:bg-amber-400/5
                                    transition-all duration-300"
                    >
                        <AnimatePresence mode="wait">
                            {!showJoinInput ? (
                                <motion.div
                                    key="empty"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex flex-col items-center gap-1"
                                >
                                    <span className="text-white/40 text-xl">+</span>
                                    <span className="text-white/40 text-[10px]">Join</span>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="input"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    className="flex flex-col items-center gap-2"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <input
                                        autoFocus
                                        value={nameInput}
                                        onChange={(e) => setNameInput(e.target.value)}
                                        onKeyDown={handleInputKeyDown}
                                        placeholder="Your name"
                                        className="w-20 h-8 text-center text-xs bg-black/80 border-2 border-amber-400/60 
                                                   rounded-lg text-white placeholder-white/50 focus:outline-none 
                                                   focus:border-amber-400 shadow-lg shadow-amber-400/20"
                                        maxLength={12}
                                    />
                                    <div className="flex gap-1">
                                        <button
                                            onClick={handleJoinClick}
                                            disabled={!nameInput.trim()}
                                            className={`px-2 py-1 text-[10px] font-bold rounded transition-all
                                                ${nameInput.trim()
                                                    ? 'bg-emerald-500 text-white hover:bg-emerald-400'
                                                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'}`}
                                        >
                                            Join
                                        </button>
                                        <button
                                            onClick={handleCancelClick}
                                            className="px-2 py-1 text-[10px] font-bold rounded bg-gray-700 text-white/70 hover:bg-gray-600 transition-all"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>

                {/* Seat number label */}
                <span className="text-white/20 text-[10px] font-medium tracking-wider">
                    SEAT {seatIndex + 1}
                </span>
            </motion.div>
        );
    }

    // Occupied seat
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`flex flex-col items-center gap-2 ${isActivePlayer ? "z-20" : "z-10"}`}
        >
            {/* Payout outcome display - above cards */}
            <AnimatePresence>
                {showPayout && payout && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.8 }}
                        className={`mb-2 px-3 py-1.5 rounded-lg font-bold text-sm shadow-lg ${payout.result === 'blackjack'
                            ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-black shadow-amber-400/40'
                            : payout.result === 'win'
                                ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-white shadow-emerald-500/40'
                                : payout.result === 'push'
                                    ? 'bg-gradient-to-r from-slate-400 to-slate-300 text-black shadow-slate-400/40'
                                    : 'bg-gradient-to-r from-red-500 to-red-400 text-white shadow-red-500/40'
                            }`}
                    >
                        {payout.result === 'blackjack' && '🎉 BLACKJACK! '}
                        {payout.result === 'win' && '✓ WIN '}
                        {payout.result === 'push' && '↔ PUSH '}
                        {payout.result === 'lose' && '✗ LOSE '}
                        {payout.amount !== 0 && (
                            <span className="ml-1">
                                {payout.amount > 0 ? '+' : ''}{payout.amount > 0 ? `$${payout.amount}` : `-$${Math.abs(payout.amount)}`}
                            </span>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Cards area */}
            <div className="min-h-[70px] flex flex-col items-center gap-2">
                {seat.hands.map((hand, handIndex) => {
                    const isThisHandActive = isActivePlayer && handIndex === activeHandIndex;
                    const hasSplit = seat.hands.length > 1;

                    return (
                        <motion.div
                            key={handIndex}
                            className={`relative ${isThisHandActive ? 'z-20' : 'z-10'}`}
                            animate={isThisHandActive ? {
                                y: [0, -4, 0],
                            } : {}}
                            transition={{ duration: 1.5, repeat: Infinity }}
                        >
                            {/* Split hand indicator */}
                            {hasSplit && (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className={`absolute -left-12 top-1/2 -translate-y-1/2 text-[10px] font-bold px-2 py-1 rounded
                                        ${isThisHandActive
                                            ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/50'
                                            : 'bg-white/10 text-white/50'}`}
                                >
                                    Hand {handIndex + 1}
                                </motion.div>
                            )}

                            {hand.cards.length > 0 && (
                                <>
                                    {/* Active hand glow effect */}
                                    {isThisHandActive && (
                                        <motion.div
                                            className="absolute inset-0 -m-2 rounded-lg"
                                            animate={{
                                                boxShadow: [
                                                    '0 0 10px 2px rgba(251,191,36,0.4)',
                                                    '0 0 20px 4px rgba(251,191,36,0.6)',
                                                    '0 0 10px 2px rgba(251,191,36,0.4)',
                                                ]
                                            }}
                                            transition={{ duration: 1.5, repeat: Infinity }}
                                        />
                                    )}

                                    <CardStack cards={hand.cards} isDoubled={hand.isDoubled} />

                                    {/* Hand value badge */}
                                    <motion.div
                                        className="absolute -right-3 -top-2"
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                    >
                                        <span
                                            className={`text-[11px] font-bold px-2 py-0.5 rounded-full shadow-lg
                                                ${handValues[handIndex]?.status === "busted"
                                                    ? "bg-gradient-to-r from-red-500 to-red-600 text-white" : ""}
                                                ${handValues[handIndex]?.status === "blackjack"
                                                    ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-black" : ""}
                                                ${handValues[handIndex]?.status !== "busted" && handValues[handIndex]?.status !== "blackjack"
                                                    ? "bg-black/80 text-white border border-white/20" : ""}
                                            `}
                                        >
                                            {handValues[handIndex]?.status === "busted"
                                                ? "BUST"
                                                : handValues[handIndex]?.status === "blackjack"
                                                    ? "BJ!"
                                                    : handValues[handIndex]?.isSoft && handValues[handIndex]!.value <= 21
                                                        ? `${handValues[handIndex]!.value - 10}/${handValues[handIndex]?.value}`
                                                        : handValues[handIndex]?.value}
                                        </span>
                                    </motion.div>
                                </>
                            )}
                        </motion.div>
                    );
                })}
            </div>

            {/* Bet display */}
            {seat.bet > 0 && (
                <motion.div
                    initial={{ scale: 0, y: 10 }}
                    animate={{ scale: 1, y: 0 }}
                >
                    <BetDisplay amount={seat.bet} compact />
                </motion.div>
            )}

            {/* Player info card */}
            <motion.div
                animate={isActivePlayer ? {
                    boxShadow: [
                        "0 0 0 3px rgba(251,191,36,0.6)",
                        "0 0 20px 5px rgba(251,191,36,0.4)",
                        "0 0 0 3px rgba(251,191,36,0.6)"
                    ]
                } : {}}
                transition={{ duration: 1.5, repeat: Infinity }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all
                    ${isCurrentPlayer
                        ? "bg-gradient-to-br from-emerald-600 to-emerald-800 shadow-lg shadow-emerald-500/30"
                        : "bg-gradient-to-br from-gray-700 to-gray-900 shadow-lg shadow-black/30"}
                    ${isActivePlayer ? "ring-2 ring-amber-400" : ""}
                `}
            >
                {/* Avatar circle */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shadow-inner
                    ${isCurrentPlayer
                        ? "bg-gradient-to-br from-amber-300 to-amber-500 text-emerald-900"
                        : "bg-gradient-to-br from-gray-500 to-gray-600 text-white"}
                `}>
                    {seat.displayName.charAt(0).toUpperCase()}
                </div>

                {/* Name and chips */}
                <div className="flex flex-col leading-tight">
                    <span className={`text-xs font-semibold truncate max-w-[60px] 
                        ${isCurrentPlayer ? "text-white" : "text-gray-200"}`}>
                        {seat.displayName}
                    </span>
                    <span className="text-[11px] text-amber-400 font-bold">
                        ${seat.chips.toLocaleString()}
                    </span>
                </div>

                {/* Active indicator */}
                {isActivePlayer && (
                    <motion.div
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="w-2 h-2 rounded-full bg-amber-400 shadow-lg shadow-amber-400/50"
                    />
                )}
            </motion.div>
        </motion.div>
    );
}

// Memoized Seat - only re-renders when seat-specific props change
export const Seat = memo(SeatComponent, (prevProps, nextProps) => {
    return (
        prevProps.seatIndex === nextProps.seatIndex &&
        prevProps.isCurrentPlayer === nextProps.isCurrentPlayer &&
        prevProps.isActivePlayer === nextProps.isActivePlayer &&
        prevProps.activeHandIndex === nextProps.activeHandIndex &&
        prevProps.showPayout === nextProps.showPayout &&
        prevProps.payout?.result === nextProps.payout?.result &&
        prevProps.payout?.amount === nextProps.payout?.amount &&
        prevProps.seat.playerId === nextProps.seat.playerId &&
        prevProps.seat.displayName === nextProps.seat.displayName &&
        prevProps.seat.chips === nextProps.seat.chips &&
        prevProps.seat.bet === nextProps.seat.bet &&
        prevProps.seat.hands.length === nextProps.seat.hands.length &&
        prevProps.seat.hands.every((hand, i) =>
            hand.cards.length === nextProps.seat.hands[i]?.cards.length &&
            hand.status === nextProps.seat.hands[i]?.status &&
            hand.isDoubled === nextProps.seat.hands[i]?.isDoubled
        )
    );
});
