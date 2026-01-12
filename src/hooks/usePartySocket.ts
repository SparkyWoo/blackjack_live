"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import PartySocket from "partysocket";
import { GameState, ClientMessage, ServerMessage, ChatMessage } from "@/lib/gameTypes";
import { sounds } from "@/lib/sounds";

const PARTYKIT_HOST = process.env.NEXT_PUBLIC_PARTYKIT_HOST || "localhost:1999";

export function usePartySocket(room: string = "main") {
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [connected, setConnected] = useState(false);
    const [reconnecting, setReconnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const socketRef = useRef<PartySocket | null>(null);
    const [lastAction, setLastAction] = useState<{
        playerId: string;
        action: string;
        seatIndex: number;
    } | null>(null);
    const [lastPayout, setLastPayout] = useState<{
        seatIndex: number;
        amount: number;
        result: 'win' | 'lose' | 'push' | 'blackjack';
    } | null>(null);
    const [lastInsurancePayout, setLastInsurancePayout] = useState<{
        seatIndex: number;
        amount: number;
    } | null>(null);
    const [leaderboard, setLeaderboard] = useState<Record<string, number> | null>(null);
    const [leaderboardAdherence, setLeaderboardAdherence] = useState<Record<string, number> | null>(null);
    const [leaderboardAtmUsage, setLeaderboardAtmUsage] = useState<Record<string, number> | null>(null);
    const [leaderboardBlackjacks, setLeaderboardBlackjacks] = useState<Record<string, number> | null>(null);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [connectionId, setConnectionId] = useState<string | null>(null);
    const prevPhaseRef = useRef<string | null>(null);
    const gameStateRef = useRef<GameState | null>(null);

    useEffect(() => {
        const socket = new PartySocket({
            host: PARTYKIT_HOST,
            room,
        });

        socketRef.current = socket;

        socket.addEventListener("open", () => {
            setConnected(true);
            setReconnecting(false);
            setError(null);
            setConnectionId(socket.id || null);
        });

        socket.addEventListener("close", () => {
            setConnected(false);
            setReconnecting(true); // PartySocket auto-reconnects
        });

        socket.addEventListener("error", () => {
            setError("Connection error");
        });

        socket.addEventListener("message", (event) => {
            try {
                const msg: ServerMessage = JSON.parse(event.data);

                switch (msg.type) {
                    case "state_update":
                        // Clear payout when transitioning from payout to betting (new round)
                        if (prevPhaseRef.current === "payout" && msg.state.phase === "betting") {
                            setLastPayout(null);
                        }
                        prevPhaseRef.current = msg.state.phase;
                        gameStateRef.current = msg.state;
                        setGameState(msg.state);
                        break;
                    case "error":
                        setError(msg.message);
                        setTimeout(() => setError(null), 3000);
                        break;
                    case "player_action":
                        setLastAction({
                            playerId: msg.playerId,
                            action: msg.action,
                            seatIndex: msg.seatIndex,
                        });
                        break;
                    case "card_dealt":
                        // Play card deal sound
                        sounds?.play("cardDeal");
                        break;
                    case "payout": {
                        // Find current player's seat index from the latest game state
                        const currentSeatIndex = gameStateRef.current?.seats.findIndex(s => s.playerId === socket.id) ?? -1;
                        const isMyPayout = currentSeatIndex !== -1 && msg.seatIndex === currentSeatIndex;

                        // Only process payouts for the current player
                        if (isMyPayout) {
                            // Accumulate payouts for multi-hand scenarios
                            setLastPayout(prev => {
                                // Determine best result (blackjack > win > push > lose)
                                const resultPriority = { blackjack: 4, win: 3, push: 2, lose: 1 };
                                const prevPriority = prev ? resultPriority[prev.result] : 0;
                                const newPriority = resultPriority[msg.result];
                                const bestResult = newPriority > prevPriority ? msg.result : (prev?.result ?? msg.result);

                                return {
                                    seatIndex: msg.seatIndex,
                                    amount: (prev?.amount ?? 0) + msg.amount,
                                    result: bestResult,
                                };
                            });

                            // Play win or lose sound only for own payouts
                            if (msg.result === "win" || msg.result === "blackjack") {
                                sounds?.play("win");
                                sounds?.play("chipCollect");
                            } else if (msg.result === "lose") {
                                sounds?.play("lose");
                            }
                        }
                        break;
                    }
                    case "insurance_payout": {
                        // Find current player's seat index from the latest game state
                        const currentSeatIdxIns = gameStateRef.current?.seats.findIndex(s => s.playerId === socket.id) ?? -1;
                        const isMyInsurancePayout = currentSeatIdxIns !== -1 && msg.seatIndex === currentSeatIdxIns;

                        // Only show insurance payout animation and play sounds for the current player
                        if (isMyInsurancePayout) {
                            setLastInsurancePayout({
                                seatIndex: msg.seatIndex,
                                amount: msg.amount
                            });
                            // Auto-dismiss after 2 seconds
                            setTimeout(() => setLastInsurancePayout(null), 2000);
                            // Play win sound for insurance payout
                            sounds?.play("win");
                            sounds?.play("chipCollect");
                        }
                        break;
                    }
                    case "leaderboard":
                        setLeaderboard(msg.balances);
                        setLeaderboardAdherence(msg.adherence);
                        setLeaderboardAtmUsage(msg.atmUsage);
                        setLeaderboardBlackjacks(msg.blackjackCounts);
                        break;
                    case "chat_broadcast":
                        setChatMessages(prev => {
                            const newMessages = [...prev, msg.chatMessage];
                            // Keep only last 50 messages
                            if (newMessages.length > 50) {
                                return newMessages.slice(-50);
                            }
                            return newMessages;
                        });
                        break;
                }
            } catch (e) {
                console.error("Failed to parse message:", e);
            }
        });

        return () => {
            socket.close();
        };
    }, [room]);

    const send = useCallback((message: ClientMessage) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify(message));
        }
    }, []);

    const joinSeat = useCallback((seatIndex: number, displayName: string) => {
        send({ type: "join_seat", seatIndex, displayName });
    }, [send]);

    const leaveSeat = useCallback(() => {
        send({ type: "leave_seat" });
    }, [send]);

    const spectate = useCallback((displayName: string) => {
        send({ type: "spectate", displayName });
    }, [send]);

    const placeBet = useCallback((amount: number) => {
        send({ type: "place_bet", amount });
    }, [send]);

    const clearBet = useCallback(() => {
        send({ type: "clear_bet" });
    }, [send]);

    const hit = useCallback(() => {
        send({ type: "hit" });
    }, [send]);

    const stand = useCallback(() => {
        send({ type: "stand" });
    }, [send]);

    const double = useCallback(() => {
        send({ type: "double" });
    }, [send]);

    const split = useCallback(() => {
        send({ type: "split" });
    }, [send]);

    const insurance = useCallback((accept: boolean) => {
        send({ type: "insurance", accept });
    }, [send]);

    const surrender = useCallback(() => {
        send({ type: "surrender" });
    }, [send]);

    const requestLeaderboard = useCallback(() => {
        send({ type: "request_leaderboard" });
    }, [send]);

    const sendChat = useCallback((message: string) => {
        send({ type: "chat_message", message });
    }, [send]);

    const useAtm = useCallback(() => {
        send({ type: "use_atm" });
    }, [send]);

    return {
        gameState,
        connected,
        reconnecting,
        error,
        lastAction,
        lastPayout,
        lastInsurancePayout,
        leaderboard,
        leaderboardAdherence,
        leaderboardAtmUsage,
        leaderboardBlackjacks,
        chatMessages,
        joinSeat,
        leaveSeat,
        spectate,
        placeBet,
        clearBet,
        hit,
        stand,
        double,
        split,
        insurance,
        surrender,
        requestLeaderboard,
        sendChat,
        useAtm,
        connectionId,
    };
}
