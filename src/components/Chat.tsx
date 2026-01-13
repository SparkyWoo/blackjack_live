"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { LazyMotion, domAnimation, m, AnimatePresence } from "framer-motion";
import { ChatMessage } from "@/lib/gameTypes";

interface ChatProps {
    messages: ChatMessage[];
    onSendMessage: (message: string) => void;
    onSendReaction: (messageId: string, emoji: string) => void;
    currentPlayerName: string | null;
}

// Available reaction emojis
const REACTION_EMOJIS = ["👍", "👎", "😂", "🔥", "💰", "🎉"];

// Reaction type for tracking reactions on messages
interface Reaction {
    emoji: string;
    sender: string;
}

export function Chat({ messages, onSendMessage, onSendReaction, currentPlayerName }: ChatProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const [unreadCount, setUnreadCount] = useState(0);
    const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
    const [messageReactions, setMessageReactions] = useState<Record<string, Reaction[]>>({});
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const lastMessageCountRef = useRef(messages.length);

    // Listen for chat_reaction events from the server
    useEffect(() => {
        const handleReaction = (e: CustomEvent<{ messageId: string; emoji: string; sender: string }>) => {
            const { messageId, emoji, sender } = e.detail;
            setMessageReactions(prev => {
                const existing = prev[messageId] || [];
                // Check if this sender already reacted with this emoji
                const alreadyReacted = existing.some(r => r.sender === sender && r.emoji === emoji);
                if (alreadyReacted) return prev;
                return {
                    ...prev,
                    [messageId]: [...existing, { emoji, sender }]
                };
            });
        };

        window.addEventListener("chat_reaction", handleReaction as EventListener);
        return () => window.removeEventListener("chat_reaction", handleReaction as EventListener);
    }, []);

    // Track unread messages when collapsed
    useEffect(() => {
        if (!isExpanded && messages.length > lastMessageCountRef.current) {
            setUnreadCount(prev => prev + (messages.length - lastMessageCountRef.current));
        }
        lastMessageCountRef.current = messages.length;
    }, [messages.length, isExpanded]);

    // Track if chat was just opened (to use instant scroll vs smooth scroll)
    const justOpenedRef = useRef(false);

    // Clear unread when expanded and mark as just opened
    useEffect(() => {
        if (isExpanded) {
            setUnreadCount(0);
            justOpenedRef.current = true;
        }
    }, [isExpanded]);

    // Ref for the messages container
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (isExpanded && messagesContainerRef.current) {
            // Use a small delay when first opened to ensure DOM is rendered
            const delay = justOpenedRef.current ? 100 : 0;
            setTimeout(() => {
                if (messagesContainerRef.current) {
                    messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
                }
                justOpenedRef.current = false;
            }, delay);
        }
    }, [messages, isExpanded]);

    const handleSend = useCallback(() => {
        if (inputValue.trim()) {
            onSendMessage(inputValue.trim());
            setInputValue("");
        }
    }, [inputValue, onSendMessage]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }, [handleSend]);

    const handleReaction = useCallback((messageId: string, emoji: string) => {
        if (currentPlayerName) {
            onSendReaction(messageId, emoji);
        }
    }, [currentPlayerName, onSendReaction]);

    const formatTime = (timestamp: number) => {
        return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    // Group reactions by emoji for display
    const getReactionCounts = (messageId: string) => {
        const reactions = messageReactions[messageId] || [];
        const counts: Record<string, number> = {};
        reactions.forEach(r => {
            counts[r.emoji] = (counts[r.emoji] || 0) + 1;
        });
        return counts;
    };

    return (
        <LazyMotion features={domAnimation}>
            <div className="fixed bottom-32 left-4 z-40">
                <AnimatePresence mode="wait">
                    {isExpanded ? (
                        <m.div
                            key="expanded"
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="w-80 h-96 bg-black/90 backdrop-blur-lg rounded-2xl border border-white/10 flex flex-col shadow-2xl"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
                                <span className="text-white/80 text-sm font-medium">💬 Chat</span>
                                <button
                                    onClick={() => setIsExpanded(false)}
                                    className="text-white/50 hover:text-white p-1"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                            </div>

                            {/* Messages */}
                            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-hide">
                                {messages.length === 0 ? (
                                    <div className="text-white/30 text-xs text-center py-4">No messages yet</div>
                                ) : (
                                    messages.map((msg) => {
                                        const reactionCounts = getReactionCounts(msg.id);
                                        const hasReactions = Object.keys(reactionCounts).length > 0;

                                        return (
                                            <div
                                                key={msg.id}
                                                className={`text-xs group relative ${msg.sender === currentPlayerName ? "text-right" : ""}`}
                                                onMouseEnter={() => setHoveredMessageId(msg.id)}
                                                onMouseLeave={() => setHoveredMessageId(null)}
                                            >
                                                <span className="text-amber-400 font-medium">{msg.sender}</span>
                                                <span className="text-white/40 ml-2">{formatTime(msg.timestamp)}</span>

                                                <div className="relative inline-block">
                                                    <div className={`mt-0.5 px-2 py-1 rounded-lg inline-block max-w-[220px] ${msg.sender === currentPlayerName
                                                        ? "bg-emerald-500/20 text-emerald-300"
                                                        : "bg-white/10 text-white/80"
                                                        }`}>
                                                        {msg.message}
                                                    </div>

                                                    {/* Reaction picker on hover */}
                                                    <AnimatePresence>
                                                        {hoveredMessageId === msg.id && currentPlayerName && (
                                                            <m.div
                                                                initial={{ opacity: 0, scale: 0.8, y: 5 }}
                                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                exit={{ opacity: 0, scale: 0.8, y: 5 }}
                                                                className={`absolute top-full mt-1 flex gap-0.5 bg-black/95 border border-white/20 rounded-lg px-1 py-0.5 z-10 ${msg.sender === currentPlayerName ? "right-0" : "left-0"}`}
                                                            >
                                                                {REACTION_EMOJIS.map(emoji => (
                                                                    <button
                                                                        key={emoji}
                                                                        onClick={() => handleReaction(msg.id, emoji)}
                                                                        className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded transition-colors text-sm"
                                                                        title={`React with ${emoji}`}
                                                                    >
                                                                        {emoji}
                                                                    </button>
                                                                ))}
                                                            </m.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>

                                                {/* Reaction display */}
                                                {hasReactions && (
                                                    <div className={`flex gap-1 mt-1 flex-wrap ${msg.sender === currentPlayerName ? "justify-end" : "justify-start"}`}>
                                                        {Object.entries(reactionCounts).map(([emoji, count]) => (
                                                            <span
                                                                key={emoji}
                                                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-white/10 rounded-full text-[10px]"
                                                            >
                                                                <span>{emoji}</span>
                                                                {count > 1 && <span className="text-white/60">{count}</span>}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div className="p-2 border-t border-white/10">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder={currentPlayerName ? "Type a message..." : "Join to chat"}
                                        disabled={!currentPlayerName}
                                        className="flex-1 bg-white/10 text-white text-sm px-3 py-1.5 rounded-lg
                                                   placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-amber-400/50
                                                   disabled:opacity-50 disabled:cursor-not-allowed"
                                        maxLength={200}
                                    />
                                    <button
                                        onClick={handleSend}
                                        disabled={!inputValue.trim() || !currentPlayerName}
                                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-sm font-medium
                                                   rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Send
                                    </button>
                                </div>
                            </div>
                        </m.div>
                    ) : (
                        <m.button
                            key="collapsed"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            onClick={() => setIsExpanded(true)}
                            className="relative p-3 bg-black/70 hover:bg-black/90 backdrop-blur-lg rounded-full
                                       border border-white/10 hover:border-amber-400/30 transition-all shadow-lg"
                        >
                            <span className="text-xl">💬</span>
                            {unreadCount > 0 && (
                                <m.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px]
                                               font-bold rounded-full flex items-center justify-center"
                                >
                                    {unreadCount > 9 ? "9+" : unreadCount}
                                </m.span>
                            )}
                        </m.button>
                    )}
                </AnimatePresence>
            </div>
        </LazyMotion>
    );
}
