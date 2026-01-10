"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import PartySocket from "partysocket";
import { GameState, ClientMessage, ServerMessage } from "@/lib/gameTypes";

const PARTYKIT_HOST = process.env.NEXT_PUBLIC_PARTYKIT_HOST || "localhost:1999";

export function usePartySocket(room: string = "main") {
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [connected, setConnected] = useState(false);
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

    useEffect(() => {
        const socket = new PartySocket({
            host: PARTYKIT_HOST,
            room,
        });

        socketRef.current = socket;

        socket.addEventListener("open", () => {
            setConnected(true);
            setError(null);
        });

        socket.addEventListener("close", () => {
            setConnected(false);
        });

        socket.addEventListener("error", () => {
            setError("Connection error");
        });

        socket.addEventListener("message", (event) => {
            try {
                const msg: ServerMessage = JSON.parse(event.data);

                switch (msg.type) {
                    case "state_update":
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
                    case "payout":
                        setLastPayout({
                            seatIndex: msg.seatIndex,
                            amount: msg.amount,
                            result: msg.result,
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

    return {
        gameState,
        connected,
        error,
        lastAction,
        lastPayout,
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
        connectionId: socketRef.current?.id || null,
    };
}
