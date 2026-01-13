"use client";

import { memo, useMemo } from "react";
import Image from "next/image";
import { LazyMotion, domAnimation, m } from "framer-motion";
import { Card as CardType, calculateHandValue, isBlackjack } from "@/lib/gameTypes";
import { CardStack } from "./Card";

interface DealerProps {
    hand: CardType[];
    phase: string;
}

// Hoisted static styles
const shoeBodyStyle = {
    background: "linear-gradient(145deg, #2a4a7a 0%, #1a3355 100%)",
    border: "1px solid #3b6998",
    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
};

const valueTransition = { delay: 0.3 };

function DealerComponent({ hand, phase }: DealerProps) {
    // Memoize expensive calculations
    const { value, allFaceUp, isBusted, hasBJ, showValue, displayValue } = useMemo(() => {
        const { value } = calculateHandValue(hand);
        const allFaceUp = hand.every((card) => card.faceUp);
        const isBusted = allFaceUp && value > 21;
        const hasBJ = isBlackjack(hand) && allFaceUp;
        const showValue = hand.length > 0 && phase !== "waiting";

        let displayValue: string;
        if (isBusted) {
            displayValue = "BUST!";
        } else if (hasBJ) {
            displayValue = "BLACKJACK!";
        } else if (allFaceUp) {
            displayValue = String(value);
        } else if (hand.length > 0) {
            displayValue = String(calculateHandValue([hand[0]]).value);
        } else {
            displayValue = "";
        }

        return { value, allFaceUp, isBusted, hasBJ, showValue, displayValue };
    }, [hand, phase]);

    return (
        <LazyMotion features={domAnimation}>
            <div className="flex flex-col items-center gap-3">
                {/* Dealer avatar and label */}
                <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="relative">
                        <Image
                            src="/dealer-avatar.png"
                            alt="Dealer"
                            width={48}
                            height={48}
                            priority
                            className="rounded-full border-2 border-amber-500/50 shadow-lg"
                        />
                        {/* Online indicator */}
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-black/50" />
                    </div>

                    {/* Dealer name */}
                    <div className="flex flex-col">
                        <span className="text-amber-400/90 text-sm font-bold uppercase tracking-wide">
                            Dealer
                        </span>
                        <span className="text-white/40 text-xs">House Rules</span>
                    </div>
                </div>

                {/* Cards area */}
                <div className="min-h-[80px] flex items-center justify-center">
                    {hand.length > 0 ? (
                        <div className="relative">
                            <CardStack cards={hand} />

                            {/* Value badge */}
                            {showValue && (
                                <m.div
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={valueTransition}
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
                                        {displayValue}
                                    </span>
                                </m.div>
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
        </LazyMotion>
    );
}

// Memoized Dealer - only re-renders when hand or phase changes
export const Dealer = memo(DealerComponent, (prevProps, nextProps) => {
    if (prevProps.phase !== nextProps.phase) return false;
    if (prevProps.hand.length !== nextProps.hand.length) return false;
    return prevProps.hand.every((card, i) =>
        card.rank === nextProps.hand[i]?.rank &&
        card.suit === nextProps.hand[i]?.suit &&
        card.faceUp === nextProps.hand[i]?.faceUp
    );
});

interface ShoeProps {
    cardsRemaining?: number;
}

function ShoeComponent({ cardsRemaining }: ShoeProps) {
    const percentage = cardsRemaining ? (cardsRemaining / 104) * 100 : 100;

    // Memoize height style
    const cardFillStyle = useMemo(() => ({
        height: `${Math.min(100, percentage)}%`
    }), [percentage]);

    // Memoize stacked card styles
    const stackedCardStyles = useMemo(() =>
        [0, 1, 2].map((i) => ({
            background: "linear-gradient(135deg, #1e3a5f 0%, #0f2744 100%)",
            border: "1px solid #3b6998",
            top: 4 + i * 2,
            left: 2 + i * 2,
            zIndex: 3 - i,
            opacity: 0.8 - i * 0.2,
        })),
        []
    );

    return (
        <div className="flex items-center gap-3">
            {/* Shoe visual */}
            <div className="relative w-12 h-8">
                {/* Shoe body */}
                <div className="absolute inset-0 rounded-md overflow-hidden" style={shoeBodyStyle}>
                    {/* Cards inside shoe */}
                    <div
                        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-amber-500/30 to-amber-500/10"
                        style={cardFillStyle}
                    />
                </div>

                {/* Stacked cards visual */}
                {stackedCardStyles.map((style, i) => (
                    <div key={i} className="absolute w-7 h-5 rounded-sm" style={style} />
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

// Memoized Shoe component
export const Shoe = memo(ShoeComponent);
