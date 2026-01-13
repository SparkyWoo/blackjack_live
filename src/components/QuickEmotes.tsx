"use client";

import { useState, useEffect, useCallback } from "react";
import { LazyMotion, domAnimation, m, AnimatePresence } from "framer-motion";

interface FloatingEmote {
    id: string;
    emoji: string;
}

interface FloatingEmotesProps {
    seatIndex: number;
}

// Quick emote selector component for seated players
interface QuickEmoteSelectorProps {
    onEmote: (emoji: string) => void;
    disabled: boolean;
}

const QUICK_EMOTES = ["🎉", "🔥", "😤", "🍀", "👏", "😎", "💪", "🤯"];

export function QuickEmoteSelector({ onEmote, disabled }: QuickEmoteSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);

    const handleEmote = useCallback((emoji: string) => {
        onEmote(emoji);
        setIsOpen(false);
    }, [onEmote]);

    if (disabled) return null;

    return (
        <LazyMotion features={domAnimation}>
            <div className="relative z-50">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(!isOpen);
                    }}
                    className="w-10 h-10 rounded-full bg-black/60 border border-white/20 
                               hover:border-amber-400/50 hover:bg-black/80 transition-all
                               flex items-center justify-center text-lg shadow-lg"
                    title="Quick emote"
                >
                    😀
                </button>

                <AnimatePresence>
                    {isOpen && (
                        <>
                            {/* Backdrop to close picker when clicking outside */}
                            <div
                                className="fixed inset-0 z-40"
                                onClick={() => setIsOpen(false)}
                            />
                            <m.div
                                initial={{ opacity: 0, scale: 0.8, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.8, y: -10 }}
                                className="absolute top-full mt-2 left-1/2 -translate-x-1/2 
                                           flex gap-1 bg-black/95 border border-white/20 
                                           rounded-xl px-2 py-1.5 shadow-xl z-50"
                            >
                                {QUICK_EMOTES.map(emoji => (
                                    <button
                                        key={emoji}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleEmote(emoji);
                                        }}
                                        className="w-8 h-8 flex items-center justify-center 
                                                   hover:bg-white/10 rounded-lg transition-colors text-lg
                                                   active:scale-90"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </m.div>
                        </>
                    )}
                </AnimatePresence>
            </div>
        </LazyMotion>
    );
}

// Floating emotes display above each seat
export function FloatingEmotes({ seatIndex }: FloatingEmotesProps) {
    const [emotes, setEmotes] = useState<FloatingEmote[]>([]);

    useEffect(() => {
        const handleEmote = (e: CustomEvent<{ seatIndex: number; emoji: string }>) => {
            if (e.detail.seatIndex !== seatIndex) return;

            const id = `${Date.now()}-${Math.random()}`;
            setEmotes(prev => [...prev, { id, emoji: e.detail.emoji }]);

            // Remove after animation
            setTimeout(() => {
                setEmotes(prev => prev.filter(em => em.id !== id));
            }, 2000);
        };

        window.addEventListener("quick_emote", handleEmote as EventListener);
        return () => window.removeEventListener("quick_emote", handleEmote as EventListener);
    }, [seatIndex]);

    return (
        <LazyMotion features={domAnimation}>
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 pointer-events-none z-50">
                <AnimatePresence>
                    {emotes.map((emote, index) => (
                        <m.div
                            key={emote.id}
                            initial={{ opacity: 0, y: 20, scale: 0.5, x: (index % 3 - 1) * 20 }}
                            animate={{ opacity: 1, y: -40, scale: 1.5 }}
                            exit={{ opacity: 0, y: -80, scale: 0.8 }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className="absolute text-3xl drop-shadow-lg"
                            style={{ left: `${(index % 3 - 1) * 30}px` }}
                        >
                            {emote.emoji}
                        </m.div>
                    ))}
                </AnimatePresence>
            </div>
        </LazyMotion>
    );
}
