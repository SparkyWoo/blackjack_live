"use client";

import { GameState, canSplit, canDouble } from "@/lib/gameTypes";
import { Seat } from "./Seat";
import { Dealer, Shoe } from "./Dealer";
import { Timer } from "./Timer";
import { Chip, ChipValue } from "./Chip";
import { motion, AnimatePresence } from "framer-motion";

interface TableProps {
    gameState: GameState;
    playerId: string | null;
    onJoinSeat: (seatIndex: number, name: string) => void;
    onPlaceBet: (amount: number) => void;
    onClearBet: () => void;
    onHit: () => void;
    onStand: () => void;
    onDouble: () => void;
    onSplit: () => void;
    onInsurance: (accept: boolean) => void;
    onLeaveSeat: () => void;
}

const BETTING_TIME = 15000;
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
    onJoinSeat,
    onPlaceBet,
    onClearBet,
    onHit,
    onStand,
    onDouble,
    onSplit,
    onInsurance,
    onLeaveSeat,
}: TableProps) {

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

            {/* Table rules text - centered on table */}
            <div className="absolute left-1/2 -translate-x-1/2 top-[38%] text-center pointer-events-none">
                <div className="text-amber-400/30 text-lg font-serif tracking-[0.3em] font-bold">
                    BLACKJACK PAYS 3 TO 2
                </div>
                <div className="text-amber-400/20 text-sm font-serif mt-2 tracking-widest">
                    DEALER STANDS ON ALL 17s
                </div>
            </div>

            {/* Top bar - Phase, Timer, Controls */}
            <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between px-6">
                {/* Phase indicator */}
                <div className="flex items-center gap-4">
                    <motion.div
                        key={gameState.phase}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2"
                    >
                        <span className="text-white font-semibold text-base tracking-wide">
                            {phaseText[gameState.phase]}
                        </span>
                    </motion.div>

                    {(gameState.phase === "betting" || gameState.phase === "player_turn") && (
                        <Timer
                            endTime={gameState.timerEndTime}
                            maxMs={gameState.phase === "betting" ? BETTING_TIME : TURN_TIME}
                        />
                    )}
                </div>

                {/* Right side - Shoe and menu */}
                <div className="flex items-center gap-5">
                    <Shoe cardsRemaining={gameState.shoe.length} />

                    {isInSeat && (
                        <button
                            onClick={onLeaveSeat}
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
                                phase={gameState.phase}
                                onJoin={(name) => onJoinSeat(index, name)}
                            />
                        </div>
                    );
                })}
            </div>

            {/* Spectators */}
            {gameState.spectators.length > 0 && (
                <div className="absolute bottom-36 right-6 flex items-center gap-2 px-3 py-1.5 bg-black/40 rounded-full">
                    <span className="text-white/60 text-xs">👁️ {gameState.spectators.length} watching</span>
                </div>
            )}

            {/* Bottom action bar */}
            <AnimatePresence>
                {isInSeat && (
                    <motion.div
                        initial={{ y: 120 }}
                        animate={{ y: 0 }}
                        exit={{ y: 120 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="absolute bottom-0 left-0 right-0"
                    >
                        {/* Gradient backdrop */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/90 to-transparent pointer-events-none" />

                        <div className="relative h-28 px-6 flex items-center justify-between">
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
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium"
                                    >
                                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                        Bet: ${currentSeat.bet.toLocaleString()}
                                    </motion.div>
                                )}
                            </div>

                            {/* Center: Chips (betting) or Actions (playing) */}
                            <div className="flex items-center gap-4">
                                {isBetting ? (
                                    <>
                                        {/* Current bet display */}
                                        {currentSeat && currentSeat.bet > 0 && (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30"
                                            >
                                                <span className="text-emerald-400 font-bold text-lg">
                                                    ${currentSeat.bet.toLocaleString()}
                                                </span>
                                                <button
                                                    onClick={onClearBet}
                                                    className="ml-2 text-red-400 hover:text-red-300 text-xs font-medium
                                                               hover:bg-red-500/20 px-2 py-1 rounded transition-all"
                                                >
                                                    Clear
                                                </button>
                                            </motion.div>
                                        )}

                                        {/* Chip selection - click to bet directly */}
                                        <div className="flex gap-2">
                                            {([10, 50, 100, 500, 1000] as ChipValue[]).map((value) => (
                                                <Chip
                                                    key={value}
                                                    value={value}
                                                    size="sm"
                                                    selected={false}
                                                    disabled={displayedChips < value}
                                                    onClick={() => onPlaceBet(value)}
                                                />
                                            ))}
                                        </div>

                                        {/* Betting hint */}
                                        <span className="text-white/40 text-xs">
                                            Click chip to bet
                                        </span>
                                    </>
                                ) : isMyTurn ? (
                                    <div className="flex gap-3">
                                        {/* Action buttons */}
                                        <motion.button
                                            whileHover={{ scale: 1.05, y: -2 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={onHit}
                                            className="px-8 py-3 bg-gradient-to-b from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600
                                                       text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 transition-all"
                                        >
                                            HIT
                                        </motion.button>

                                        <motion.button
                                            whileHover={{ scale: 1.05, y: -2 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={onStand}
                                            className="px-8 py-3 bg-gradient-to-b from-red-500 to-red-700 hover:from-red-400 hover:to-red-600
                                                       text-white font-bold rounded-xl shadow-lg shadow-red-500/30 transition-all"
                                        >
                                            STAND
                                        </motion.button>

                                        {canDoubleDown && (
                                            <motion.button
                                                whileHover={{ scale: 1.05, y: -2 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={onDouble}
                                                className="px-6 py-3 bg-gradient-to-b from-purple-500 to-purple-700 hover:from-purple-400 hover:to-purple-600
                                                           text-white font-bold rounded-xl shadow-lg shadow-purple-500/30 transition-all"
                                            >
                                                DOUBLE
                                            </motion.button>
                                        )}

                                        {canSplitHand && (
                                            <motion.button
                                                whileHover={{ scale: 1.05, y: -2 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={onSplit}
                                                className="px-6 py-3 bg-gradient-to-b from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600
                                                           text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all"
                                            >
                                                SPLIT
                                            </motion.button>
                                        )}
                                    </div>
                                ) : gameState.phase === "insurance" && currentSeat && currentSeat.bet > 0 && currentSeat.insuranceBet === 0 ? (
                                    <div className="flex flex-col items-center gap-3">
                                        <span className="text-amber-400 text-sm font-medium">
                                            Dealer shows Ace - Insurance? (costs ${Math.floor(currentSeat.bet / 2)})
                                        </span>
                                        <div className="flex gap-3">
                                            <motion.button
                                                whileHover={{ scale: 1.05, y: -2 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => onInsurance(true)}
                                                className="px-8 py-3 bg-gradient-to-b from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600
                                                           text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 transition-all"
                                            >
                                                YES
                                            </motion.button>
                                            <motion.button
                                                whileHover={{ scale: 1.05, y: -2 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => onInsurance(false)}
                                                className="px-8 py-3 bg-gradient-to-b from-red-500 to-red-700 hover:from-red-400 hover:to-red-600
                                                           text-white font-bold rounded-xl shadow-lg shadow-red-500/30 transition-all"
                                            >
                                                NO
                                            </motion.button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 text-white/50 text-sm">
                                        <motion.div
                                            animate={{ opacity: [0.3, 0.7, 0.3] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                            className="flex items-center gap-2"
                                        >
                                            <div className="w-2 h-2 rounded-full bg-white/40" />
                                            {gameState.phase === "waiting"
                                                ? "Waiting for game to start..."
                                                : gameState.phase === "payout"
                                                    ? "Calculating winnings..."
                                                    : gameState.phase === "insurance"
                                                        ? "Waiting for insurance decisions..."
                                                        : "Waiting for your turn..."}
                                        </motion.div>
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
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Not in seat - show subtle prompt */}
            {!isInSeat && (
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
                    <motion.div
                        animate={{ opacity: [0.4, 0.8, 0.4], y: [0, -5, 0] }}
                        transition={{ duration: 2.5, repeat: Infinity }}
                        className="px-6 py-3 bg-black/50 rounded-full border border-white/10 backdrop-blur-sm"
                    >
                        <span className="text-white/70 text-sm font-medium">
                            Click an empty seat to join the table
                        </span>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
