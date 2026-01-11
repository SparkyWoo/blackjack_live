"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import PartySocket from "partysocket";
import { GameState, ClientMessage, ServerMessage } from "@/lib/gameTypes";
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
    const [connectionId, setConnectionId] = useState<string | null>(null);
    const prevPhaseRef = useRef<string | null>(null);

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
                        prevPhaseRef.current = msg.state.phase;
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
                    case "payout":
                        setLastPayout({
                            seatIndex: msg.seatIndex,
                            amount: msg.amount,
                            result: msg.result,
                        });
                        // Auto-dismiss payout notification after 2 seconds
                        setTimeout(() => setLastPayout(null), 2000);
                        // Play win or lose sound
                        if (msg.result === "win" || msg.result === "blackjack") {
                            sounds?.play("win");
                            sounds?.play("chipCollect");
                        } else if (msg.result === "lose") {
                            sounds?.play("lose");
                        }
                        break;
                    case "insurance_payout":
                        setLastInsurancePayout({
                            seatIndex: msg.seatIndex,
                            amount: msg.amount
                        });
                        // Auto-dismiss after 2 seconds
                        setTimeout(() => setLastInsurancePayout(null), 2000);
                        // Play win sound for insurance payout
                        sounds?.play("win");
                        sounds?.play("chipCollect");
                        break;
                    case "leaderboard":
                        setLeaderboard(msg.balances);
                        setLeaderboardAdherence(msg.adherence);
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
        connectionId,
    };
}
