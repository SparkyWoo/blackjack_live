"use client";

import { usePartySocket } from "@/hooks/usePartySocket";
import { Table } from "@/components/Table";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { motion } from "framer-motion";

// Safe localStorage wrapper for private browsing mode
function safeLocalStorage(action: 'get' | 'set', key: string, value?: string): string | null {
  try {
    if (action === 'get') {
      return localStorage.getItem(key);
    } else if (value !== undefined) {
      localStorage.setItem(key, value);
    }
  } catch {
    // Silently fail in private browsing mode
  }
  return null;
}

export default function Home() {
  const {
    gameState,
    connected,
    reconnecting,
    error,
    joinSeat,
    leaveSeat,
    placeBet,
    clearBet,
    hit,
    stand,
    double,
    split,
    surrender,
    insurance,
    connectionId,
    lastPayout,
    lastInsurancePayout,
    leaderboard,
    leaderboardAdherence,
    leaderboardAtmUsage,
    chatMessages,
    lastAction,
    requestLeaderboard,
    sendChat,
    useAtm,
  } = usePartySocket("main-table");

  const handleJoinSeat = (seatIndex: number, name: string) => {
    // Save name to localStorage for persistence (safe for private browsing)
    safeLocalStorage('set', "blackjack_name", name);
    joinSeat(seatIndex, name);
  };

  // Loading/reconnecting state
  if (!connected) {
    return (
      <div className="min-h-screen flex flex-col gap-4 items-center justify-center bg-[#061a10]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 border-3 border-amber-400 border-t-transparent rounded-full"
        />
        {reconnecting && (
          <span className="text-amber-400/80 text-sm animate-pulse">Reconnecting...</span>
        )}
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#061a10]">
        <div className="text-amber-400">Connecting to table...</div>
      </div>
    );
  }

  return (
    <>
      <ErrorBoundary>
        <Table
          gameState={gameState}
          playerId={connectionId}
          lastPayout={lastPayout}
          lastInsurancePayout={lastInsurancePayout}
          leaderboard={leaderboard}
          leaderboardAdherence={leaderboardAdherence}
          leaderboardAtmUsage={leaderboardAtmUsage}
          chatMessages={chatMessages}
          lastAction={lastAction}
          onJoinSeat={handleJoinSeat}
          onPlaceBet={placeBet}
          onClearBet={clearBet}
          onHit={hit}
          onStand={stand}
          onDouble={double}
          onSplit={split}
          onSurrender={surrender}
          onInsurance={insurance}
          onLeaveSeat={leaveSeat}
          onRequestLeaderboard={requestLeaderboard}
          onSendChat={sendChat}
          onUseAtm={useAtm}
        />
      </ErrorBoundary>
      {/* Error toast */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="fixed bottom-40 left-1/2 -translate-x-1/2 
                     bg-red-500/90 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg z-50"
        >
          {error}
        </motion.div>
      )}
    </>
  );
}

