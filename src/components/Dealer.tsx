"use client";

import { motion } from "framer-motion";
import { Card as CardType, calculateHandValue, isBlackjack } from "@/lib/gameTypes";
import { CardStack } from "./Card";

interface DealerProps {
    hand: CardType[];
    phase: string;
}

export function Dealer({ hand, phase }: DealerProps) {
    const { value } = calculateHandValue(hand);
    const allFaceUp = hand.every((card) => card.faceUp);
    const isBusted = allFaceUp && value > 21;
    const hasBJ = isBlackjack(hand) && allFaceUp;

    const showValue = hand.length > 0 && phase !== "waiting";

    return (
        <div className="flex flex-col items-center gap-3">
            {/* Dealer label */}
            <div className="flex items-center gap-2">
                <div className="h-px w-8 bg-gradient-to-r from-transparent to-amber-500/40" />
                <span className="text-amber-400/90 text-sm font-bold uppercase tracking-[0.2em]">
                    Dealer
                </span>
                <div className="h-px w-8 bg-gradient-to-l from-transparent to-amber-500/40" />
            </div>

            {/* Cards area */}
            <div className="min-h-[80px] flex items-center justify-center">
                {hand.length > 0 ? (
                    <div className="relative">
                        <CardStack cards={hand} isDealer />

                        {/* Value badge */}
                        {showValue && (
                            <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="absolute -right-4 -top-2"
                            >
                                <span
                                    className={`text-sm font-bold px-3 py-1 rounded-full shadow-lg
                                        ${isBusted
                                            ? "bg-gradient-to-r from-red-500 to-red-600 text-white" : ""}
                                        ${hasBJ
                                            ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-black" : ""}
                                        ${!isBusted && !hasBJ
                                            ? "bg-black/80 text-white border border-white/20" : ""}
                                    `}
                                >
                                    {isBusted
                                        ? "BUST!"
                                        : hasBJ
                                            ? "BLACKJACK!"
                                            : allFaceUp
                                                ? value
                                                : `${calculateHandValue([hand[0]]).value}`}
                                </span>
                            </motion.div>
                        )}
                    </div>
                ) : (
                    /* Empty card placeholder */
                    <div
                        className="w-14 h-20 rounded-lg border-2 border-dashed border-white/10 
                                   flex items-center justify-center"
                    >
                        <span className="text-white/20 text-2xl">🃏</span>
                    </div>
                )}
            </div>
        </div>
    );
}

export function Shoe({ cardsRemaining }: { cardsRemaining?: number }) {
    const percentage = cardsRemaining ? (cardsRemaining / 104) * 100 : 100;

    return (
        <div className="flex items-center gap-3">
            {/* Shoe visual */}
            <div className="relative w-12 h-8">
                {/* Shoe body */}
                <div
                    className="absolute inset-0 rounded-md overflow-hidden"
                    style={{
                        background: "linear-gradient(145deg, #2a4a7a 0%, #1a3355 100%)",
                        border: "1px solid #3b6998",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                    }}
                >
                    {/* Cards inside shoe */}
                    <div
                        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-amber-500/30 to-amber-500/10"
                        style={{ height: `${Math.min(100, percentage)}%` }}
                    />
                </div>

                {/* Stacked cards visual */}
                {[0, 1, 2].map((i) => (
                    <div
                        key={i}
                        className="absolute w-7 h-5 rounded-sm"
                        style={{
                            background: "linear-gradient(135deg, #1e3a5f 0%, #0f2744 100%)",
                            border: "1px solid #3b6998",
                            top: 4 + i * 2,
                            left: 2 + i * 2,
                            zIndex: 3 - i,
                            opacity: 0.8 - i * 0.2,
                        }}
                    />
                ))}
            </div>

            {/* Card count */}
            {cardsRemaining !== undefined && (
                <div className="flex flex-col">
                    <span className="text-[10px] text-white/40 uppercase tracking-wider">Shoe</span>
                    <span className="text-xs text-white/70 font-medium">{cardsRemaining}</span>
                </div>
            )}
        </div>
    );
}
