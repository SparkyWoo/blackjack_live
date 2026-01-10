"use client";

import { motion } from "framer-motion";
import { Card as CardType } from "@/lib/gameTypes";

interface CardProps {
    card: CardType;
    delay?: number;
    small?: boolean;
}

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

export function Card({ card, delay = 0, small = false }: CardProps) {
    const symbol = suitSymbols[card.suit];
    const color = suitColors[card.suit];
    const size = small ? "w-11 h-15" : "w-14 h-20";
    const fontSize = small ? "text-xs" : "text-sm";
    const symbolSize = small ? "text-xl" : "text-2xl";

    if (!card.faceUp) {
        return (
            <motion.div
                initial={{ x: 80, y: -40, rotate: 15, opacity: 0 }}
                animate={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
                transition={{ duration: 0.35, delay, ease: "easeOut" }}
                className={`${size} rounded-lg shadow-xl relative flex-shrink-0`}
                style={{
                    background: `
                        linear-gradient(145deg, #2a4a7a 0%, #1a3355 50%, #0f2040 100%)
                    `,
                    border: "2px solid #3b6998",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.1)",
                }}
            >
                {/* Card back pattern */}
                <div className="absolute inset-1.5 rounded-md border border-amber-500/20 overflow-hidden">
                    <div
                        className="w-full h-full opacity-30"
                        style={{
                            backgroundImage: `
                                repeating-linear-gradient(45deg, 
                                    transparent, transparent 3px, 
                                    rgba(255,200,100,0.15) 3px, rgba(255,200,100,0.15) 6px
                                )
                            `,
                        }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-amber-500/40 text-lg">♠</span>
                    </div>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ x: 80, y: -40, rotate: 15, opacity: 0 }}
            animate={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
            transition={{ duration: 0.35, delay, ease: "easeOut" }}
            className={`${size} rounded-lg shadow-xl relative flex-shrink-0`}
            style={{
                background: "linear-gradient(145deg, #ffffff 0%, #f8f8f8 50%, #f0f0f0 100%)",
                border: "1px solid #ddd",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.8)",
            }}
        >
            {/* Top left rank/suit */}
            <div className="absolute top-1 left-1.5 flex flex-col items-center leading-none" style={{ color }}>
                <span className={`${fontSize} font-bold`}>{card.rank}</span>
                <span className="text-[10px]">{symbol}</span>
            </div>

            {/* Center suit */}
            <div className="absolute inset-0 flex items-center justify-center" style={{ color }}>
                <span className={`${symbolSize} drop-shadow-sm`}>{symbol}</span>
            </div>

            {/* Bottom right rank/suit (inverted) */}
            <div className="absolute bottom-1 right-1.5 flex flex-col items-center leading-none rotate-180" style={{ color }}>
                <span className={`${fontSize} font-bold`}>{card.rank}</span>
                <span className="text-[10px]">{symbol}</span>
            </div>

            {/* Subtle inner glow */}
            <div className="absolute inset-0 rounded-lg pointer-events-none"
                style={{
                    boxShadow: "inset 0 0 10px rgba(0,0,0,0.05)",
                }}
            />
        </motion.div>
    );
}

export function CardStack({ cards, isDealer = false }: { cards: CardType[]; isDealer?: boolean }) {
    return (
        <div className="flex" style={{ marginLeft: 0 }}>
            {cards.map((card, index) => (
                <div
                    key={index}
                    style={{ marginLeft: index === 0 ? 0 : -26 }}
                    className="relative"
                >
                    <Card card={card} delay={index * 0.12} small />
                </div>
            ))}
        </div>
    );
}
