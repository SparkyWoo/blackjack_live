"use client";

import { useEffect, useState, useRef } from "react";
import { GameState, canSplit, canDouble } from "@/lib/gameTypes";
import { Seat } from "./Seat";
import { Dealer, Shoe } from "./Dealer";
import { Timer } from "./Timer";
import { Chip, ChipValue } from "./Chip";
import { LazyMotion, domAnimation, m, AnimatePresence } from "framer-motion";
import { sounds } from "@/lib/sounds";
import { haptic } from "@/lib/haptics";
import { Leaderboard } from "./Leaderboard";

// Memoized animation variants for performance
const pulseAnimation = { opacity: [0.4, 0.8, 0.4] };

interface TableProps {
    gameState: GameState;
    playerId: string | null;
    lastPayout: {
        seatIndex: number;
        amount: number;
        result: 'win' | 'lose' | 'push' | 'blackjack';
    } | null;
    leaderboard: Record<string, number> | null;
    onJoinSeat: (seatIndex: number, name: string) => void;
    onPlaceBet: (amount: number) => void;
    onClearBet: () => void;
    onHit: () => void;
    onStand: () => void;
    onDouble: () => void;
    onSplit: () => void;
    onSurrender: () => void;
    onInsurance: (accept: boolean) => void;
    onLeaveSeat: () => void;
    onRequestLeaderboard: () => void;
}

const BETTING_TIME = 5000;  // 5 seconds - restarts on bet changes
const TURN_TIME = 10000;

// Seat positions in semicircle arc (from left to right)
// Each seat has angle, x offset from center, and y offset from bottom
const SEAT_POSITIONS = [
    { angle: -60, x: -42, y: 38 },  // Seat 1 - far left
    { angle: -36, x: -28, y: 28 },  // Seat 2
    { angle: -12, x: -12, y: 22 },  // Seat 3 - center left
    { angle: 12, x: 12, y: 22 },    // Seat 4 - center right
    { angle: 36, x: 28, y: 28 },    // Seat 5
    { angle: 60, x: 42, y: 38 },    // Seat 6 - far right
];

export function Table({
    gameState,
    playerId,
    lastPayout,
    leaderboard,
    onJoinSeat,
    onPlaceBet,
    onClearBet,
    onHit,
    onStand,
    onDouble,
    onSplit,
    onSurrender,
    onInsurance,
    onLeaveSeat,
    onRequestLeaderboard,
}: TableProps) {
    // Mute toggle state
    const [isMuted, setIsMuted] = useState(false);
    const [showKeyboardHints, setShowKeyboardHints] = useState(false);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const prevIsMyTurnRef = useRef(false);

    const currentPlayerSeatIndex = gameState.seats.findIndex((s) => s.playerId === playerId);
    const isInSeat = currentPlayerSeatIndex !== -1;
    const currentSeat = isInSeat ? gameState.seats[currentPlayerSeatIndex] : null;

    const isBetting = gameState.phase === "betting";
    const isMyTurn = gameState.phase === "player_turn" &&
        gameState.activePlayerIndex === currentPlayerSeatIndex;

    // Calculate displayed chips (subtract pending bet during betting phase)
    const displayedChips = currentSeat
        ? (isBetting ? currentSeat.chips - currentSeat.bet : currentSeat.chips)
        : 0;

    // Get active hand for action checks
    const activeHand = currentSeat?.hands[gameState.activeHandIndex];
    const canDoubleDown = activeHand && canDouble(activeHand) && displayedChips >= activeHand.bet;
    const canSplitHand = activeHand && canSplit(activeHand) && displayedChips >= activeHand.bet && (currentSeat?.hands.length ?? 0) < 4;
    const canSurrenderHand = activeHand && activeHand.cards.length === 2 && !activeHand.isSplit;

    // Play "your turn" sound and haptic when it becomes the player's turn
    useEffect(() => {
        if (isMyTurn && !prevIsMyTurnRef.current) {
            sounds?.play("yourTurn");
            haptic("medium");
        }
        prevIsMyTurnRef.current = isMyTurn;
    }, [isMyTurn]);

    // Keyboard shortcuts for game actions
    useEffect(() => {
        if (!isMyTurn) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger if typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            const key = e.key.toLowerCase();
            switch (key) {
                case 'h':
                    onHit();
                    break;
                case 's':
                    onStand();
                    break;
                case 'd':
                    if (canDoubleDown) onDouble();
                    break;
                case 'p':
                    if (canSplitHand) onSplit();
                    break;
                case 'r':
                    if (canSurrenderHand) onSurrender();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isMyTurn, canDoubleDown, canSplitHand, canSurrenderHand, onHit, onStand, onDouble, onSplit, onSurrender]);

    // Handle mute toggle
    const handleMuteToggle = () => {
        const newMuted = !isMuted;
        setIsMuted(newMuted);
        sounds?.setMuted(newMuted);
    };

    // Phase descriptions
    const phaseText = {
        waiting: "Waiting for players...",
        betting: "💰 Place your bets!",
        dealing: "🃏 Dealing cards...",
        insurance: "🛡️ Insurance?",
        player_turn: gameState.activePlayerIndex >= 0
            ? `${gameState.seats[gameState.activePlayerIndex]?.displayName}'s turn`
            : "Player turn",
        dealer_turn: "🎰 Dealer's turn",
        payout: "✨ Round complete!",
    };

    return (
        <LazyMotion features={domAnimation}>
            <div className="relative w-full h-screen overflow-hidden select-none">
                {/* Background - premium casino atmosphere */}
                <div
                    className="absolute inset-0"
                    style={{
                        background: `
                        radial-gradient(ellipse 150% 100% at 50% 120%, #1a5c3a 0%, #0d3320 35%, #061a10 70%, #020a06 100%)
                    `,
                    }}
                />

                {/* Ambient lighting effects */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background: `
                        radial-gradient(circle at 50% 0%, rgba(255,200,100,0.08) 0%, transparent 40%),
                        radial-gradient(circle at 20% 80%, rgba(255,180,50,0.03) 0%, transparent 30%),
                        radial-gradient(circle at 80% 80%, rgba(255,180,50,0.03) 0%, transparent 30%)
                    `,
                    }}
                />

                {/* Table felt texture */}
                <div
                    className="absolute inset-0 opacity-30"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%' height='100%' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                    }}
                />

                {/* Main table surface - semicircle */}
                <div
                    className="absolute left-1/2 -translate-x-1/2 bottom-28"
                    style={{
                        width: "min(95vw, 1000px)",
                        height: "min(55vh, 450px)",
                    }}
                >
                    {/* Outer wooden rail */}
                    <div
                        className="absolute inset-0 rounded-t-[100%]"
                        style={{
                            background: `linear-gradient(180deg, 
                            #8B5A2B 0%, 
                            #5c3d2e 20%, 
                            #4a3122 50%,
                            #3d2819 100%
                        )`,
                            boxShadow: `
                            inset 0 -4px 12px rgba(0,0,0,0.5),
                            0 8px 32px rgba(0,0,0,0.6),
                            0 2px 8px rgba(0,0,0,0.4)
                        `,
                            padding: "12px",
                        }}
                    >
                        {/* Inner felt surface */}
                        <div
                            className="w-full h-full rounded-t-[100%]"
                            style={{
                                background: `
                                radial-gradient(ellipse 100% 80% at 50% 100%, #1e6b45 0%, #165c3a 40%, #0f4d2e 100%)
                            `,
                                boxShadow: `
                                inset 0 4px 20px rgba(0,0,0,0.4),
                                inset 0 -2px 10px rgba(255,255,255,0.05)
                            `,
                            }}
                        />
                    </div>

                    {/* Gold trim line */}
                    <div
                        className="absolute left-[12px] right-[12px] top-[12px] bottom-0 rounded-t-[100%] pointer-events-none"
                        style={{
                            border: "2px solid transparent",
                            borderBottom: "none",
                            background: `linear-gradient(180deg, rgba(255,200,100,0.3) 0%, transparent 50%) border-box`,
                            WebkitMask: "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
                            WebkitMaskComposite: "xor",
                            maskComposite: "exclude",
                        }}
                    />
                </div>

                {/* Table rules text - centered on table - hidden on small screens */}
                <div className="absolute left-1/2 -translate-x-1/2 top-[38%] text-center pointer-events-none hidden sm:block">
                    <div className="text-amber-400/40 text-lg font-serif tracking-[0.3em] font-bold">
                        BLACKJACK PAYS 3 TO 2
                    </div>
                    <div className="text-amber-400/30 text-sm font-serif mt-2 tracking-widest">
                        DEALER STANDS ON ALL 17s
                    </div>
                </div>

                {/* Top bar - Phase, Timer, Controls */}
                <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between px-6">
                    {/* Phase indicator */}
                    <div className="flex items-center gap-4">
                        <m.div
                            key={gameState.phase}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-2"
                        >
                            <span className="text-white font-semibold text-base tracking-wide">
                                {phaseText[gameState.phase]}
                            </span>
                        </m.div>

                        {(gameState.phase === "betting" || gameState.phase === "player_turn") && (
                            <Timer
                                endTime={gameState.timerEndTime}
                                maxMs={gameState.phase === "betting" ? BETTING_TIME : TURN_TIME}
                            />
                        )}
                    </div>

                    {/* Right side - Shoe, Mute, and Leave */}
                    <div className="flex items-center gap-3">
                        <Shoe cardsRemaining={gameState.shoe.length} />

                        {/* Leaderboard button */}
                        <button
                            onClick={() => {
                                haptic("light");
                                onRequestLeaderboard();
                                setShowLeaderboard(true);
                            }}
                            aria-label="View leaderboard"
                            className="p-2 text-white/60 hover:text-amber-400 hover:bg-amber-400/10 rounded-lg transition-all"
                            title="Leaderboard"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </button>

                        {/* Mute toggle button */}
                        <button
                            onClick={handleMuteToggle}
                            aria-label={isMuted ? "Unmute sounds" : "Mute sounds"}
                            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                            title={isMuted ? "Unmute" : "Mute"}
                        >
                            {isMuted ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                </svg>
                            )}
                        </button>

                        {/* Keyboard hints toggle */}
                        <button
                            onClick={() => setShowKeyboardHints(!showKeyboardHints)}
                            aria-label="Toggle keyboard shortcuts"
                            className={`p-2 rounded-lg transition-all hidden sm:block ${showKeyboardHints
                                ? 'text-amber-400 bg-amber-400/10'
                                : 'text-white/60 hover:text-white hover:bg-white/10'
                                }`}
                            title="Keyboard shortcuts"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                            </svg>
                        </button>

                        {isInSeat && (
                            <button
                                onClick={onLeaveSeat}
                                aria-label="Leave the table"
                                className="px-3 py-1.5 text-xs text-red-400/80 hover:text-red-300 hover:bg-red-500/10 
                                       rounded-lg transition-all border border-red-500/20 hover:border-red-500/40"
                            >
                                Leave Table
                            </button>
                        )}
                    </div>
                </div>

                {/* Dealer area - top center */}
                <div className="absolute left-1/2 -translate-x-1/2 top-16">
                    <Dealer hand={gameState.dealerHand} phase={gameState.phase} />
                </div>

                {/* Player seats - arranged in semicircle arc */}
                <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-full" style={{ maxWidth: "min(95vw, 950px)" }}>
                    {gameState.seats.map((seat, index) => {
                        const pos = SEAT_POSITIONS[index];
                        if (!pos) return null; // Guard for TypeScript noUncheckedIndexedAccess
                        return (
                            <div
                                key={index}
                                className="absolute"
                                style={{
                                    left: `calc(50% + ${pos.x}%)`,
                                    bottom: `${pos.y}%`,
                                    transform: `translateX(-50%) rotate(${pos.angle * 0.1}deg)`,
                                }}
                            >
                                <Seat
                                    seat={seat}
                                    seatIndex={index}
                                    isCurrentPlayer={seat.playerId === playerId}
                                    isActivePlayer={index === gameState.activePlayerIndex}
                                    activeHandIndex={gameState.activeHandIndex}
                                    onJoin={(name) => onJoinSeat(index, name)}
                                />
                            </div>
                        );
                    })}
                </div>

                {/* Spectators */}
                {gameState.spectators.length > 0 && (
                    <div className="absolute bottom-36 right-2 sm:right-6 flex items-center gap-2 px-3 py-1.5 bg-black/40 rounded-full">
                        <span className="text-white/70 text-xs">👁️ {gameState.spectators.length} watching</span>
                    </div>
                )}

                {/* Bottom action bar */}
                <AnimatePresence>
                    {isInSeat && (
                        <m.div
                            initial={{ y: 120 }}
                            animate={{ y: 0 }}
                            exit={{ y: 120 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="absolute bottom-0 left-0 right-0"
                        >
                            {/* Gradient backdrop */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/90 to-transparent pointer-events-none" />

                            <div className="relative h-28 px-3 sm:px-6 flex items-center justify-between">
                                {/* Left: Your info */}
                                <div className="flex flex-col gap-1 min-w-[120px]">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black font-bold text-sm shadow-lg">
                                            {currentSeat?.displayName.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-white/80 text-xs truncate max-w-[80px]">
                                                {currentSeat?.displayName}
                                            </span>
                                            <span className="text-amber-400 text-lg font-bold">
                                                ${displayedChips.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                    {currentSeat && currentSeat.bet > 0 && (
                                        <m.div
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium"
                                        >
                                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                            Bet: ${currentSeat.bet.toLocaleString()}
                                        </m.div>
                                    )}
                                </div>

                                {/* Center: Chips (betting) or Actions (playing) */}
                                <div className="flex items-center gap-4">
                                    {isBetting ? (
                                        <>
                                            {/* Current bet display */}
                                            {currentSeat && currentSeat.bet > 0 && (
                                                <m.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30"
                                                >
                                                    <span className="text-emerald-400 font-bold text-lg">
                                                        ${currentSeat.bet.toLocaleString()}
                                                    </span>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onClearBet();
                                                        }}
                                                        aria-label="Clear current bet"
                                                        className="ml-2 text-red-400 hover:text-red-300 text-xs font-medium
                                                               hover:bg-red-500/20 px-2 py-1 rounded transition-all"
                                                    >
                                                        Clear
                                                    </button>
                                                </m.div>
                                            )}

                                            {/* Chip selection - click to bet directly */}
                                            <div className="flex gap-1.5 sm:gap-2 overflow-x-auto max-w-[280px] sm:max-w-none pb-1 sm:pb-0 scrollbar-hide">
                                                {([10, 50, 100, 500, 1000] as ChipValue[]).map((value) => (
                                                    <Chip
                                                        key={value}
                                                        value={value}
                                                        size="sm"
                                                        selected={false}
                                                        disabled={displayedChips < value}
                                                        onClick={() => {
                                                            sounds?.play("chipClick");
                                                            onPlaceBet(value);
                                                        }}
                                                    />
                                                ))}
                                            </div>

                                            {/* All-In Button */}
                                            {displayedChips > 0 && (
                                                <m.button
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => {
                                                        sounds?.play("chipClick");
                                                        onPlaceBet(displayedChips);
                                                    }}
                                                    className="px-4 py-2 bg-gradient-to-b from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500
                                                           text-black font-bold text-sm rounded-lg shadow-lg shadow-amber-500/30 transition-all"
                                                >
                                                    ALL IN
                                                </m.button>
                                            )}

                                            {/* Betting hint */}
                                            <span className="text-white/50 text-xs hidden sm:inline">
                                                Click chip to bet
                                            </span>
                                        </>
                                    ) : isMyTurn ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="flex gap-2 sm:gap-3 flex-wrap justify-center">
                                                {/* Action buttons with ARIA labels */}
                                                <m.button
                                                    whileHover={{ scale: 1.05, y: -2 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => { haptic("light"); onHit(); }}
                                                    aria-label="Hit - take another card (keyboard: H)"
                                                    className="px-5 sm:px-8 py-2.5 sm:py-3 bg-gradient-to-b from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600
                                                       text-white font-bold text-sm sm:text-base rounded-xl shadow-lg shadow-emerald-500/30 transition-all relative"
                                                >
                                                    HIT
                                                    {showKeyboardHints && (
                                                        <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-white/50 font-normal">H</span>
                                                    )}
                                                </m.button>

                                                <m.button
                                                    whileHover={{ scale: 1.05, y: -2 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => { haptic("light"); onStand(); }}
                                                    aria-label="Stand - keep your cards (keyboard: S)"
                                                    className="px-5 sm:px-8 py-2.5 sm:py-3 bg-gradient-to-b from-red-500 to-red-700 hover:from-red-400 hover:to-red-600
                                                       text-white font-bold text-sm sm:text-base rounded-xl shadow-lg shadow-red-500/30 transition-all relative"
                                                >
                                                    STAND
                                                    {showKeyboardHints && (
                                                        <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-white/50 font-normal">S</span>
                                                    )}
                                                </m.button>

                                                {canDoubleDown && (
                                                    <m.button
                                                        whileHover={{ scale: 1.05, y: -2 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => { haptic("light"); onDouble(); }}
                                                        aria-label="Double down - double your bet and take one card (keyboard: D)"
                                                        className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-b from-purple-500 to-purple-700 hover:from-purple-400 hover:to-purple-600
                                                           text-white font-bold text-sm sm:text-base rounded-xl shadow-lg shadow-purple-500/30 transition-all relative"
                                                    >
                                                        DOUBLE
                                                        {showKeyboardHints && (
                                                            <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-white/50 font-normal">D</span>
                                                        )}
                                                    </m.button>
                                                )}

                                                {canSplitHand && (
                                                    <m.button
                                                        whileHover={{ scale: 1.05, y: -2 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => { haptic("light"); onSplit(); }}
                                                        aria-label="Split - split your pair into two hands (keyboard: P)"
                                                        className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-b from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600
                                                           text-white font-bold text-sm sm:text-base rounded-xl shadow-lg shadow-blue-500/30 transition-all relative"
                                                    >
                                                        SPLIT
                                                        {showKeyboardHints && (
                                                            <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-white/50 font-normal">P</span>
                                                        )}
                                                    </m.button>
                                                )}

                                                {canSurrenderHand && (
                                                    <m.button
                                                        whileHover={{ scale: 1.05, y: -2 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => { haptic("light"); onSurrender(); }}
                                                        aria-label="Surrender - forfeit half your bet (keyboard: R)"
                                                        className="px-3 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-b from-gray-500 to-gray-700 hover:from-gray-400 hover:to-gray-600
                                                           text-white font-bold rounded-xl shadow-lg shadow-gray-500/30 transition-all text-xs sm:text-sm relative"
                                                    >
                                                        SURRENDER
                                                        {showKeyboardHints && (
                                                            <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-white/50 font-normal">R</span>
                                                        )}
                                                    </m.button>
                                                )}
                                            </div>
                                            {/* Your turn indicator */}
                                            <m.div
                                                initial={{ opacity: 0, y: 5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="text-amber-400 text-xs font-medium"
                                            >
                                                🎯 Your turn! {showKeyboardHints ? '' : 'Use keyboard shortcuts (H/S/D/P/R)'}
                                            </m.div>
                                        </div>
                                    ) : gameState.phase === "insurance" && currentSeat && currentSeat.bet > 0 && currentSeat.insuranceBet === 0 ? (
                                        <div className="flex flex-col items-center gap-3">
                                            <span className="text-amber-400 text-sm font-medium">
                                                Dealer shows Ace - Insurance? (costs ${Math.floor(currentSeat.bet / 2)})
                                            </span>
                                            <div className="flex gap-3">
                                                <m.button
                                                    whileHover={{ scale: 1.05, y: -2 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => onInsurance(true)}
                                                    className="px-8 py-3 bg-gradient-to-b from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600
                                                           text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 transition-all"
                                                >
                                                    YES
                                                </m.button>
                                                <m.button
                                                    whileHover={{ scale: 1.05, y: -2 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => onInsurance(false)}
                                                    className="px-8 py-3 bg-gradient-to-b from-red-500 to-red-700 hover:from-red-400 hover:to-red-600
                                                           text-white font-bold rounded-xl shadow-lg shadow-red-500/30 transition-all"
                                                >
                                                    NO
                                                </m.button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3 text-white/60 text-sm">
                                            <m.div
                                                animate={pulseAnimation}
                                                transition={{ duration: 2, repeat: Infinity }}
                                                className="flex items-center gap-2"
                                            >
                                                <div className="w-2 h-2 rounded-full bg-white/50" />
                                                {gameState.phase === "waiting"
                                                    ? "Waiting for game to start..."
                                                    : gameState.phase === "payout"
                                                        ? "Calculating winnings..."
                                                        : gameState.phase === "insurance"
                                                            ? "Waiting for insurance decisions..."
                                                            : "Waiting for your turn..."}
                                            </m.div>
                                        </div>
                                    )}
                                </div>

                                {/* Right: Connection status */}
                                <div className="flex items-center gap-2 min-w-[100px] justify-end">
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                                        <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50 animate-pulse" />
                                        <span className="text-emerald-400/90 text-xs font-medium">Online</span>
                                    </div>
                                </div>
                            </div>
                        </m.div>
                    )}
                </AnimatePresence>

                {/* Not in seat - show subtle prompt */}
                {!isInSeat && (
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
                        <m.div
                            animate={{ opacity: [0.4, 0.8, 0.4], y: [0, -5, 0] }}
                            transition={{ duration: 2.5, repeat: Infinity }}
                            className="px-6 py-3 bg-black/50 rounded-full border border-white/10 backdrop-blur-sm"
                        >
                            <span className="text-white/70 text-sm font-medium">
                                Click an empty seat to join the table
                            </span>
                        </m.div>
                    </div>
                )}

                {/* Payout Animation Overlay */}
                <AnimatePresence>
                    {lastPayout && lastPayout.amount > 0 && (
                        <m.div
                            key={`payout-${lastPayout.seatIndex}-${lastPayout.result}-${lastPayout.amount}`}
                            initial={{ opacity: 0, scale: 0.5, y: 50 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: -30 }}
                            transition={{ duration: 0.5, ease: "backOut" }}
                            className="fixed inset-0 flex items-center justify-center pointer-events-none z-50"
                        >
                            <m.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className={`flex flex-col items-center gap-3 px-8 py-6 rounded-2xl shadow-2xl
                                ${lastPayout.result === 'blackjack'
                                        ? 'bg-gradient-to-br from-amber-600 to-yellow-500'
                                        : lastPayout.result === 'win'
                                            ? 'bg-gradient-to-br from-emerald-600 to-emerald-400'
                                            : 'bg-gradient-to-br from-blue-600 to-blue-400'
                                    }`}
                            >
                                {/* Chip animation */}
                                <m.div
                                    className="flex gap-1"
                                    initial="hidden"
                                    animate="visible"
                                    variants={{
                                        visible: { transition: { staggerChildren: 0.1 } },
                                        hidden: {}
                                    }}
                                >
                                    {[1, 2, 3].map((i) => (
                                        <m.div
                                            key={i}
                                            variants={{
                                                hidden: { y: -50, opacity: 0, rotate: -20 },
                                                visible: { y: 0, opacity: 1, rotate: 0 }
                                            }}
                                            className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 border-2 border-amber-300 shadow-lg flex items-center justify-center text-[10px] font-bold text-amber-900"
                                        >
                                            $
                                        </m.div>
                                    ))}
                                </m.div>

                                {/* Result text */}
                                <m.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.3, type: "spring" }}
                                    className="text-white text-2xl font-black tracking-wide drop-shadow-lg"
                                >
                                    {lastPayout.result === 'blackjack' && '🎉 BLACKJACK!'}
                                    {lastPayout.result === 'win' && '🏆 WIN!'}
                                    {lastPayout.result === 'push' && '🤝 PUSH'}
                                </m.div>

                                {/* Amount */}
                                <m.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 }}
                                    className="text-white/90 text-xl font-bold"
                                >
                                    +${lastPayout.amount.toLocaleString()}
                                </m.div>
                            </m.div>
                        </m.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Leaderboard Modal */}
            <Leaderboard
                isOpen={showLeaderboard}
                onClose={() => setShowLeaderboard(false)}
                balances={leaderboard || {}}
            />
        </LazyMotion>
    );
}

