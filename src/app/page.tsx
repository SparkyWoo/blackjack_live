"use client";

import { useEffect, useState } from "react";
import { usePartySocket } from "@/hooks/usePartySocket";
import { Table } from "@/components/Table";
import { motion } from "framer-motion";

export default function Home() {
  const {
    gameState,
    connected,
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
  } = usePartySocket("main-table");

  const handleJoinSeat = (seatIndex: number, name: string) => {
    // Save name to localStorage for persistence
    localStorage.setItem("blackjack_name", name);
    joinSeat(seatIndex, name);
  };

  // Loading state
  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#061a10]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 border-3 border-amber-400 border-t-transparent rounded-full"
        />
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
      <Table
        gameState={gameState}
        playerId={connectionId}
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
      />

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
