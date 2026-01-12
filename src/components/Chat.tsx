"use client";

import { useState, useRef, useEffect } from "react";
import { LazyMotion, domAnimation, m, AnimatePresence } from "framer-motion";
import { ChatMessage } from "@/lib/gameTypes";

interface ChatProps {
    messages: ChatMessage[];
    onSendMessage: (message: string) => void;
    currentPlayerName: string | null;
}

export function Chat({ messages, onSendMessage, currentPlayerName }: ChatProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const [unreadCount, setUnreadCount] = useState(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const lastMessageCountRef = useRef(messages.length);

    // Track unread messages when collapsed
    useEffect(() => {
        if (!isExpanded && messages.length > lastMessageCountRef.current) {
            setUnreadCount(prev => prev + (messages.length - lastMessageCountRef.current));
        }
        lastMessageCountRef.current = messages.length;
    }, [messages.length, isExpanded]);

    // Clear unread when expanded
    useEffect(() => {
        if (isExpanded) {
            setUnreadCount(0);
        }
    }, [isExpanded]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (isExpanded) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isExpanded]);

    const handleSend = () => {
        if (inputValue.trim()) {
            onSendMessage(inputValue.trim());
            setInputValue("");
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const formatTime = (timestamp: number) => {
        return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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
                            className="w-72 h-80 bg-black/90 backdrop-blur-lg rounded-2xl border border-white/10 flex flex-col shadow-2xl"
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
                            <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-hide">
                                {messages.length === 0 ? (
                                    <div className="text-white/30 text-xs text-center py-4">No messages yet</div>
                                ) : (
                                    messages.map((msg) => (
                                        <div
                                            key={msg.id}
                                            className={`text-xs ${msg.sender === currentPlayerName ? "text-right" : ""}`}
                                        >
                                            <span className="text-amber-400 font-medium">{msg.sender}</span>
                                            <span className="text-white/40 ml-2">{formatTime(msg.timestamp)}</span>
                                            <div className={`mt-0.5 px-2 py-1 rounded-lg inline-block max-w-[200px] ${msg.sender === currentPlayerName
                                                    ? "bg-emerald-500/20 text-emerald-300"
                                                    : "bg-white/10 text-white/80"
                                                }`}>
                                                {msg.message}
                                            </div>
                                        </div>
                                    ))
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
