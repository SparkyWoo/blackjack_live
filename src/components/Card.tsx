"use client";

import { memo, useMemo } from "react";
import { LazyMotion, domAnimation, m } from "framer-motion";
import { Card as CardType } from "@/lib/gameTypes";

interface CardProps {
    card: CardType;
    delay?: number;
    small?: boolean;
}

// Hoisted static objects for performance
const suitSymbols: Record<string, string> = {
    hearts: "♥",
    diamonds: "♦",
    clubs: "♣",
    spades: "♠",
};

const suitColors: Record<string, string> = {
    hearts: "#ef4444",
    diamonds: "#ef4444",
    clubs: "#1f2937",
    spades: "#1f2937",
};

// Static style objects hoisted outside component
const cardBackStyle = {
    background: "linear-gradient(145deg, #2a4a7a 0%, #1a3355 50%, #0f2040 100%)",
    border: "2px solid #3b6998",
    boxShadow: "0 4px 12px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.1)",
};

const cardBackPatternStyle = {
    backgroundImage: `repeating-linear-gradient(45deg, 
        transparent, transparent 3px, 
        rgba(255,200,100,0.15) 3px, rgba(255,200,100,0.15) 6px
    )`,
};

const cardFaceStyle = {
    background: "linear-gradient(145deg, #ffffff 0%, #f8f8f8 50%, #f0f0f0 100%)",
    border: "1px solid #ddd",
    boxShadow: "0 4px 12px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.8)",
};

const innerGlowStyle = {
    boxShadow: "inset 0 0 10px rgba(0,0,0,0.05)",
};

const sidewaysCardStyle = { transformOrigin: 'center center' };

// Animation variants hoisted for reuse
const cardInitial = { x: 80, y: -40, rotate: 15, opacity: 0 };
const cardAnimate = { x: 0, y: 0, rotate: 0, opacity: 1 };
const sidewaysAnimate = { x: 0, y: 0, rotate: 90, opacity: 1 };

function CardComponent({ card, delay = 0, small = false }: CardProps) {
    const symbol = suitSymbols[card.suit];
    const color = suitColors[card.suit];
    const size = small ? "w-11 h-15" : "w-14 h-20";
    const fontSize = small ? "text-xs" : "text-sm";
    const symbolSize = small ? "text-xl" : "text-2xl";

    const transition = useMemo(() => ({ duration: 0.35, delay, ease: "easeOut" as const }), [delay]);
    const colorStyle = useMemo(() => ({ color }), [color]);

    if (!card.faceUp) {
        return (
            <LazyMotion features={domAnimation}>
                <m.div
                    initial={cardInitial}
                    animate={cardAnimate}
                    transition={transition}
                    className={`${size} rounded-lg shadow-xl relative flex-shrink-0`}
                    style={cardBackStyle}
                >
                    <div className="absolute inset-1.5 rounded-md border border-amber-500/20 overflow-hidden">
                        <div className="w-full h-full opacity-30" style={cardBackPatternStyle} />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-amber-500/40 text-lg">♠</span>
                        </div>
                    </div>
                </m.div>
            </LazyMotion>
        );
    }

    return (
        <LazyMotion features={domAnimation}>
            <m.div
                initial={cardInitial}
                animate={cardAnimate}
                transition={transition}
                className={`${size} rounded-lg shadow-xl relative flex-shrink-0`}
                style={cardFaceStyle}
            >
                {/* Top left rank/suit */}
                <div className="absolute top-1 left-1.5 flex flex-col items-center leading-none" style={colorStyle}>
                    <span className={`${fontSize} font-bold`}>{card.rank}</span>
                    <span className="text-[10px]">{symbol}</span>
                </div>

                {/* Center suit */}
                <div className="absolute inset-0 flex items-center justify-center" style={colorStyle}>
                    <span className={`${symbolSize} drop-shadow-sm`}>{symbol}</span>
                </div>

                {/* Bottom right rank/suit (inverted) */}
                <div className="absolute bottom-1 right-1.5 flex flex-col items-center leading-none rotate-180" style={colorStyle}>
                    <span className={`${fontSize} font-bold`}>{card.rank}</span>
                    <span className="text-[10px]">{symbol}</span>
                </div>

                {/* Subtle inner glow */}
                <div className="absolute inset-0 rounded-lg pointer-events-none" style={innerGlowStyle} />
            </m.div>
        </LazyMotion>
    );
}

// Memoized Card component - only re-renders when card props change
export const Card = memo(CardComponent, (prevProps, nextProps) => {
    return (
        prevProps.card.rank === nextProps.card.rank &&
        prevProps.card.suit === nextProps.card.suit &&
        prevProps.card.faceUp === nextProps.card.faceUp &&
        prevProps.delay === nextProps.delay &&
        prevProps.small === nextProps.small
    );
});

interface CardStackProps {
    cards: CardType[];
    isDoubled?: boolean;
}

function CardStackComponent({ cards, isDoubled = false }: CardStackProps) {
    return (
        <LazyMotion features={domAnimation}>
            <div className="flex items-center" style={{ marginLeft: 0 }}>
                {cards.map((card, index) => {
                    const isSidewaysCard = isDoubled && index === 2;
                    const marginLeft = index === 0 ? 0 : isSidewaysCard ? -18 : -26;
                    const transition = { duration: 0.35, delay: index * 0.12, ease: "easeOut" as const };

                    return (
                        <div key={`${card.rank}-${card.suit}-${index}`} style={{ marginLeft }} className="relative">
                            {isSidewaysCard ? (
                                <m.div
                                    initial={cardInitial}
                                    animate={sidewaysAnimate}
                                    transition={transition}
                                    style={sidewaysCardStyle}
                                >
                                    <Card card={card} delay={0} small />
                                </m.div>
                            ) : (
                                <Card card={card} delay={index * 0.12} small />
                            )}
                        </div>
                    );
                })}
            </div>
        </LazyMotion>
    );
}

// Memoized CardStack - only re-renders when cards array changes
export const CardStack = memo(CardStackComponent);
