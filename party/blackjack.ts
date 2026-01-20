import type * as Party from "partykit/server";
import {
    GameState,
    ClientMessage,
    ServerMessage,
    ChatMessage,
    createInitialGameState,
    createShoe,
    createEmptySeat,
    calculateHandValue,
    isBlackjack,
    canSplit,
    canDouble,
    Hand,
    Card,
    Rank,
} from "../src/lib/gameTypes";
import { isOptimalAction, Action } from "./basicStrategy";

const INITIAL_CHIPS = 10000;
const BETTING_TIME = 5000; // 5 seconds - restarts on every bet change
const TURN_TIME = 10000; // 10 seconds
const PAYOUT_TIME = 2000; // 2 seconds (reduced from 5 for snappier feel)
const DEALER_CARD_DELAY = 400; // 400ms between dealer cards (reduced from 800)
const DEALING_DELAY = 500; // 500ms after dealing before player turns (reduced from 1000)

// Sanitize user input to prevent XSS attacks
function sanitizeInput(input: string, maxLength: number = 50): string {
    return input
        .slice(0, maxLength)
        .replace(/[<>"'&]/g, '') // Remove HTML special chars
        .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
        .trim();
}

// Rate limiter to prevent WebSocket spam attacks
class RateLimiter {
    private requests: Map<string, number[]> = new Map();
    private readonly maxRequests: number;
    private readonly windowMs: number;

    constructor(maxRequests: number = 20, windowMs: number = 5000) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
    }

    isAllowed(connectionId: string): boolean {
        const now = Date.now();
        const timestamps = this.requests.get(connectionId) || [];

        // Filter out old timestamps
        const recentTimestamps = timestamps.filter(t => now - t < this.windowMs);

        if (recentTimestamps.length >= this.maxRequests) {
            return false; // Rate limit exceeded
        }

        recentTimestamps.push(now);
        this.requests.set(connectionId, recentTimestamps);
        return true;
    }

    cleanup(connectionId: string): void {
        this.requests.delete(connectionId);
    }
}

export default class BlackjackServer implements Party.Server {
    state: GameState;
    strategyStats: Record<string, { correct: number; total: number }> = {};
    atmUsage: Record<string, number> = {};
    blackjackCounts: Record<string, number> = {};
    timerCallback: (() => void) | null = null;
    bettingTimerStarted: boolean = false;
    rateLimiter: RateLimiter = new RateLimiter(20, 5000); // 20 messages per 5 seconds

    constructor(readonly room: Party.Room) {
        this.state = createInitialGameState();
    }

    // Load persisted chip balances when server starts
    async onStart() {
        const storedBalances = await this.room.storage.get<Record<string, number>>("chipBalances");
        if (storedBalances) {
            this.state.chipBalances = storedBalances;
        }
        const storedStats = await this.room.storage.get<Record<string, { correct: number; total: number }>>("strategyStats");
        if (storedStats) {
            this.strategyStats = storedStats;
        }
        const storedAtmUsage = await this.room.storage.get<Record<string, number>>("atmUsage");
        if (storedAtmUsage) {
            this.atmUsage = storedAtmUsage;
        }
        const storedBlackjackCounts = await this.room.storage.get<Record<string, number>>("blackjackCounts");
        if (storedBlackjackCounts) {
            this.blackjackCounts = storedBlackjackCounts;
        }
    }

    // PartyKit alarm handler - this is how timers work in PartyKit
    async onAlarm() {
        if (this.timerCallback) {
            const callback = this.timerCallback;
            this.timerCallback = null;
            callback();
        }
    }

    onConnect(conn: Party.Connection, _ctx: Party.ConnectionContext) {
        // Send current state to new connection
        this.sendToConnection(conn, { type: "state_update", state: this.state });
    }

    onClose(conn: Party.Connection) {
        // Check if this player was in a seat
        const seatIndex = this.state.seats.findIndex((s) => s.playerId === conn.id);
        if (seatIndex !== -1) {
            const seat = this.state.seats[seatIndex];
            // Save chip balance before leaving
            if (seat?.displayName) {
                this.state.chipBalances[seat.displayName] = seat.chips;
            }

            // Check if this was the active player during their turn
            const wasActivePlayer = this.state.phase === "player_turn" && this.state.activePlayerIndex === seatIndex;

            // Mark all their hands as forfeited (busted) so they don't hold up the game
            for (const hand of seat.hands) {
                if (hand.status === "playing") {
                    hand.status = "busted";
                }
            }

            this.state.seats[seatIndex] = createEmptySeat();

            // If this was the active player, advance to next player
            if (wasActivePlayer) {
                this.state.activePlayerIndex = this.findNextActivePlayer(seatIndex);
                this.state.activeHandIndex = 0;

                if (this.state.activePlayerIndex === -1) {
                    // All players done, dealer's turn
                    this.startDealerTurn();
                } else {
                    // Find first active hand for new player
                    const newSeat = this.state.seats[this.state.activePlayerIndex];
                    for (let i = 0; i < newSeat.hands.length; i++) {
                        if (newSeat.hands[i].status === "playing") {
                            this.state.activeHandIndex = i;
                            break;
                        }
                    }
                    // Restart turn timer for new active player
                    this.state.timerEndTime = Date.now() + 10000; // TURN_TIME
                    this.state.timer = 10000;
                    this.startTimer(10000, () => this.onTurnTimeout());
                }
            }
        }

        // Remove from spectators
        this.state.spectators = this.state.spectators.filter((s) => s.id !== conn.id);

        // Cleanup rate limiter for this connection
        this.rateLimiter.cleanup(conn.id);

        this.broadcastState();
        this.checkGameState();
    }

    onMessage(message: string, sender: Party.Connection) {
        // Rate limiting check
        if (!this.rateLimiter.isAllowed(sender.id)) {
            this.sendToConnection(sender, { type: "error", message: "Too many requests. Please slow down." });
            return;
        }

        try {
            const msg: ClientMessage = JSON.parse(message);
            this.handleMessage(msg, sender);
        } catch (_e) {
            this.sendToConnection(sender, { type: "error", message: "Invalid message format" });
        }
    }

    handleMessage(msg: ClientMessage, sender: Party.Connection) {
        switch (msg.type) {
            case "request_state":
                this.sendToConnection(sender, { type: "state_update", state: this.state });
                break;

            case "join_seat":
                this.handleJoinSeat(msg.seatIndex, msg.displayName, sender);
                break;

            case "leave_seat":
                this.handleLeaveSeat(sender);
                break;

            case "spectate":
                this.handleSpectate(msg.displayName, sender);
                break;

            case "place_bet":
                this.handlePlaceBet(msg.amount, sender);
                break;

            case "clear_bet":
                this.handleClearBet(sender);
                break;

            case "hit":
                this.handleHit(sender);
                break;

            case "stand":
                this.handleStand(sender);
                break;

            case "double":
                this.handleDouble(sender);
                break;

            case "split":
                this.handleSplit(sender);
                break;

            case "insurance":
                this.handleInsurance(msg.accept, sender);
                break;

            case "surrender":
                this.handleSurrender(sender);
                break;

            case "request_leaderboard":
                this.handleRequestLeaderboard(sender);
                break;

            case "chat_message":
                this.handleChatMessage(msg.message, sender);
                break;

            case "chat_reaction":
                this.handleChatReaction(msg.messageId, msg.emoji, sender);
                break;

            case "quick_emote":
                this.handleQuickEmote(msg.emoji, sender);
                break;

            case "use_atm":
                this.handleUseAtm(sender);
                break;

            default:
                this.sendToConnection(sender, { type: "error", message: "Unknown message type" });
        }
    }

    handleJoinSeat(seatIndex: number, displayName: string, sender: Party.Connection) {
        // Sanitize display name
        const sanitizedName = sanitizeInput(displayName, 12);
        if (!sanitizedName) {
            this.sendToConnection(sender, { type: "error", message: "Invalid name" });
            return;
        }

        if (seatIndex < 0 || seatIndex >= 6) {
            this.sendToConnection(sender, { type: "error", message: "Invalid seat" });
            return;
        }

        const seat = this.state.seats[seatIndex];
        if (seat.playerId !== null) {
            this.sendToConnection(sender, { type: "error", message: "Seat is taken" });
            return;
        }

        // Check if player is already in a seat
        const existingSeat = this.state.seats.findIndex((s) => s.playerId === sender.id);
        if (existingSeat !== -1) {
            this.sendToConnection(sender, { type: "error", message: "Already in a seat" });
            return;
        }

        // Remove from spectators if they were spectating
        this.state.spectators = this.state.spectators.filter((s) => s.id !== sender.id);

        // Get or create chip balance for this display name
        const chips = this.state.chipBalances[sanitizedName] ?? INITIAL_CHIPS;
        this.state.chipBalances[sanitizedName] = chips;

        // Assign seat
        this.state.seats[seatIndex] = {
            playerId: sender.id,
            displayName: sanitizedName,
            chips,
            bet: 0,
            lastBet: 0,
            insuranceBet: 0,
            hands: [],
            status: "waiting",
        };

        this.broadcastState();
        this.checkGameState();
    }

    handleLeaveSeat(sender: Party.Connection) {
        const seatIndex = this.state.seats.findIndex((s) => s.playerId === sender.id);
        if (seatIndex === -1) return;

        const seat = this.state.seats[seatIndex];
        // Save chip balance
        if (seat.displayName) {
            this.state.chipBalances[seat.displayName] = seat.chips;
        }

        this.state.seats[seatIndex] = createEmptySeat();
        this.broadcastState();
        this.checkGameState();
    }

    handleSpectate(displayName: string, sender: Party.Connection) {
        // Sanitize display name
        const sanitizedName = sanitizeInput(displayName, 12) || "Spectator";

        // Remove from any seat first
        const seatIndex = this.state.seats.findIndex((s) => s.playerId === sender.id);
        if (seatIndex !== -1) {
            const seat = this.state.seats[seatIndex];
            if (seat.displayName) {
                this.state.chipBalances[seat.displayName] = seat.chips;
            }
            this.state.seats[seatIndex] = createEmptySeat();
        }

        // Add to spectators if not already
        if (!this.state.spectators.find((s) => s.id === sender.id)) {
            this.state.spectators.push({ id: sender.id, name: sanitizedName });
        }

        this.broadcastState();
        this.checkGameState();
    }

    handleRequestLeaderboard(sender: Party.Connection) {
        // Return all chip balances from both in-game and persisted storage
        const allBalances: Record<string, number> = { ...this.state.chipBalances };

        // Also include currently seated players with their live chip counts
        for (const seat of this.state.seats) {
            if (seat.playerId && seat.displayName) {
                allBalances[seat.displayName] = seat.chips;
            }
        }

        // Calculate adherence percentages
        const adherence: Record<string, number> = {};
        for (const [name, stats] of Object.entries(this.strategyStats)) {
            if (stats.total > 0) {
                adherence[name] = Math.round((stats.correct / stats.total) * 100);
            }
        }

        this.sendToConnection(sender, {
            type: "leaderboard",
            balances: allBalances,
            adherence,
            atmUsage: this.atmUsage,
            blackjackCounts: this.blackjackCounts
        });
    }

    handleChatMessage(message: string, sender: Party.Connection) {
        // Sanitize message content
        const sanitizedMessage = sanitizeInput(message, 200);
        if (!sanitizedMessage) return;

        // Find sender name from seat or spectators
        let senderName = "Anonymous";
        const seat = this.state.seats.find(s => s.playerId === sender.id);
        if (seat?.displayName) {
            senderName = seat.displayName;
        } else {
            const spectator = this.state.spectators.find(s => s.id === sender.id);
            if (spectator) {
                senderName = spectator.name;
            }
        }

        // Create chat message
        const chatMessage: ChatMessage = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            sender: senderName,
            message: sanitizedMessage,
            timestamp: Date.now()
        };

        // Add to state (keep last 50 messages)
        this.state.chatMessages.push(chatMessage);
        if (this.state.chatMessages.length > 50) {
            this.state.chatMessages.shift();
        }

        // Broadcast to all connections
        this.broadcast({ type: "chat_broadcast", chatMessage });
    }

    handleChatReaction(messageId: string, emoji: string, sender: Party.Connection) {
        // Find sender name
        let senderName = "Anonymous";
        const seat = this.state.seats.find(s => s.playerId === sender.id);
        if (seat?.displayName) {
            senderName = seat.displayName;
        } else {
            const spectator = this.state.spectators.find(s => s.id === sender.id);
            if (spectator) {
                senderName = spectator.name;
            }
        }

        // Validate emoji (only allow specific reaction emojis)
        const allowedEmojis = ["👍", "👎", "😂", "🔥", "💰", "🎉"];
        if (!allowedEmojis.includes(emoji)) return;

        // Broadcast reaction to all
        this.broadcast({
            type: "chat_reaction",
            messageId,
            emoji,
            sender: senderName
        });
    }

    handleQuickEmote(emoji: string, sender: Party.Connection) {
        // Find sender's seat
        const seatIndex = this.state.seats.findIndex(s => s.playerId === sender.id);
        if (seatIndex === -1) return; // Must be seated

        // Validate emoji (only allow specific emotes)
        const allowedEmotes = ["🎉", "🔥", "😤", "🍀", "👏", "😎", "💪", "🤯"];
        if (!allowedEmotes.includes(emoji)) return;

        // Broadcast emote to all
        this.broadcast({
            type: "quick_emote",
            seatIndex,
            emoji
        });
    }

    async handleUseAtm(sender: Party.Connection) {
        const seatIndex = this.state.seats.findIndex(s => s.playerId === sender.id);
        if (seatIndex === -1) {
            this.sendToConnection(sender, { type: "error", message: "Must be seated to use ATM" });
            return;
        }

        const seat = this.state.seats[seatIndex];

        // Only allow ATM when player has $0
        if (seat.chips > 0 || seat.bet > 0) {
            this.sendToConnection(sender, { type: "error", message: "ATM only available when you have $0" });
            return;
        }

        // Give $10,000 and track usage
        seat.chips = INITIAL_CHIPS;
        if (seat.displayName) {
            this.atmUsage[seat.displayName] = (this.atmUsage[seat.displayName] || 0) + 1;
            this.state.chipBalances[seat.displayName] = seat.chips;
            await this.room.storage.put("atmUsage", this.atmUsage);
        }

        this.broadcastState();
    }

    async handlePlaceBet(amount: number, sender: Party.Connection) {
        if (this.state.phase !== "betting") {
            this.sendToConnection(sender, { type: "error", message: "Cannot bet now" });
            return;
        }

        const seatIndex = this.state.seats.findIndex((s) => s.playerId === sender.id);
        if (seatIndex === -1) {
            this.sendToConnection(sender, { type: "error", message: "Not in a seat" });
            return;
        }

        const seat = this.state.seats[seatIndex];
        if (seat.bet + amount > seat.chips) {
            this.sendToConnection(sender, { type: "error", message: "Not enough chips" });
            return;
        }

        seat.bet += amount;
        seat.status = "betting";

        // Restart the 5-second timer on every bet change
        this.bettingTimerStarted = true;
        this.state.timerEndTime = Date.now() + BETTING_TIME;
        this.state.timer = BETTING_TIME;
        await this.startTimer(BETTING_TIME, () => this.onBettingEnd());

        this.broadcastState();
    }

    async handleClearBet(sender: Party.Connection) {
        if (this.state.phase !== "betting") return;

        const seatIndex = this.state.seats.findIndex((s) => s.playerId === sender.id);
        if (seatIndex === -1) return;

        const previousBet = this.state.seats[seatIndex].bet;
        this.state.seats[seatIndex].bet = 0;
        this.state.seats[seatIndex].lastBet = 0; // Also clear lastBet to prevent auto-bet
        this.state.seats[seatIndex].status = "waiting";

        // Restart timer if there was a bet change and someone still has a bet
        if (previousBet > 0 && this.state.seats.some(s => s.bet > 0)) {
            this.state.timerEndTime = Date.now() + BETTING_TIME;
            this.state.timer = BETTING_TIME;
            await this.startTimer(BETTING_TIME, () => this.onBettingEnd());
        }

        this.broadcastState();
    }

    handleHit(sender: Party.Connection) {
        if (this.state.phase !== "player_turn") return;

        const seatIndex = this.state.seats.findIndex((s) => s.playerId === sender.id);
        if (seatIndex === -1 || seatIndex !== this.state.activePlayerIndex) return;

        const seat = this.state.seats[seatIndex];
        const hand = seat.hands[this.state.activeHandIndex];
        if (!hand || hand.status !== "playing") return;

        // Track strategy decision before modifying hand
        const handCanDouble = canDouble(hand) && seat.chips >= hand.bet;
        const handCanSplit = canSplit(hand) && seat.hands.length < 4 && seat.chips >= hand.bet;
        const handCanSurrender = hand.cards.length === 2 && !hand.isSplit;
        const isOptimal = this.trackStrategyDecision(seat.displayName, "hit", hand, handCanDouble, handCanSplit, handCanSurrender);

        // Broadcast action to all players
        this.broadcast({ type: "player_action", playerId: sender.id, action: "hit", seatIndex, isOptimal });

        // Deal card
        const card = this.drawCard();
        hand.cards.push(card);

        this.broadcast({
            type: "card_dealt",
            target: "player",
            seatIndex,
            handIndex: this.state.activeHandIndex,
            card,
        });

        // Check for bust
        const { value } = calculateHandValue(hand.cards);
        if (value > 21) {
            hand.status = "busted";
            this.nextPlayerOrHand();
        } else if (value === 21) {
            hand.status = "standing";
            this.nextPlayerOrHand();
        } else {
            // Player can continue - reset timer for next action
            this.state.timerEndTime = Date.now() + TURN_TIME;
            this.state.timer = TURN_TIME;
            this.startTimer(TURN_TIME, () => this.onTurnTimeout());
        }

        this.broadcastState();
    }

    handleStand(sender: Party.Connection) {
        if (this.state.phase !== "player_turn") return;

        const seatIndex = this.state.seats.findIndex((s) => s.playerId === sender.id);
        if (seatIndex === -1 || seatIndex !== this.state.activePlayerIndex) return;

        const seat = this.state.seats[seatIndex];
        const hand = seat.hands[this.state.activeHandIndex];
        if (!hand || hand.status !== "playing") return;

        // Track strategy decision
        const handCanDouble = canDouble(hand) && seat.chips >= hand.bet;
        const handCanSplit = canSplit(hand) && seat.hands.length < 4 && seat.chips >= hand.bet;
        const handCanSurrender = hand.cards.length === 2 && !hand.isSplit;
        const isOptimal = this.trackStrategyDecision(seat.displayName, "stand", hand, handCanDouble, handCanSplit, handCanSurrender);

        // Broadcast action to all players
        this.broadcast({ type: "player_action", playerId: sender.id, action: "stand", seatIndex, isOptimal });

        hand.status = "standing";
        this.nextPlayerOrHand();
        this.broadcastState();
    }

    handleSurrender(sender: Party.Connection) {
        if (this.state.phase !== "player_turn") return;

        const seatIndex = this.state.seats.findIndex((s) => s.playerId === sender.id);
        if (seatIndex === -1 || seatIndex !== this.state.activePlayerIndex) return;

        const seat = this.state.seats[seatIndex];
        const hand = seat.hands[this.state.activeHandIndex];
        if (!hand || hand.status !== "playing") return;

        // Can only surrender on first two cards, not on split hands
        if (hand.cards.length !== 2 || hand.isSplit) {
            this.sendToConnection(sender, { type: "error", message: "Cannot surrender now" });
            return;
        }

        // Track strategy decision
        const handCanDouble = canDouble(hand) && seat.chips >= hand.bet;
        const handCanSplit = canSplit(hand) && seat.hands.length < 4 && seat.chips >= hand.bet;
        const isOptimal = this.trackStrategyDecision(seat.displayName, "surrender", hand, handCanDouble, true, true);

        // Broadcast action to all players
        this.broadcast({ type: "player_action", playerId: sender.id, action: "surrender", seatIndex, isOptimal });

        // Return half the bet
        seat.chips += Math.floor(hand.bet / 2);
        hand.status = "surrendered";

        this.nextPlayerOrHand();
        this.broadcastState();
    }

    handleDouble(sender: Party.Connection) {
        if (this.state.phase !== "player_turn") return;

        const seatIndex = this.state.seats.findIndex((s) => s.playerId === sender.id);
        if (seatIndex === -1 || seatIndex !== this.state.activePlayerIndex) return;

        const seat = this.state.seats[seatIndex];
        const hand = seat.hands[this.state.activeHandIndex];
        if (!hand || !canDouble(hand)) return;

        // Check if player has enough chips for the additional bet (equal to original bet)
        if (seat.chips < hand.bet) {
            this.sendToConnection(sender, { type: "error", message: "Not enough chips to double" });
            return;
        }

        // Track strategy decision
        const handCanSplit = canSplit(hand) && seat.hands.length < 4 && seat.chips >= hand.bet;
        const handCanSurrender = hand.cards.length === 2 && !hand.isSplit;
        const isOptimal = this.trackStrategyDecision(seat.displayName, "double", hand, true, handCanSplit, handCanSurrender);

        // Broadcast action to all players
        this.broadcast({ type: "player_action", playerId: sender.id, action: "double", seatIndex, isOptimal });

        // Double the bet - deduct additional chips equal to original bet
        seat.chips -= hand.bet;
        hand.bet *= 2;
        hand.isDoubled = true;

        // Deal one card
        const card = this.drawCard();
        hand.cards.push(card);

        this.broadcast({
            type: "card_dealt",
            target: "player",
            seatIndex,
            handIndex: this.state.activeHandIndex,
            card,
        });

        // Check for bust, then auto-stand
        const { value } = calculateHandValue(hand.cards);
        hand.status = value > 21 ? "busted" : "standing";

        this.nextPlayerOrHand();
        this.broadcastState();
    }

    handleSplit(sender: Party.Connection) {
        if (this.state.phase !== "player_turn") return;

        const seatIndex = this.state.seats.findIndex((s) => s.playerId === sender.id);
        if (seatIndex === -1 || seatIndex !== this.state.activePlayerIndex) return;

        const seat = this.state.seats[seatIndex];
        const hand = seat.hands[this.state.activeHandIndex];
        if (!hand || !canSplit(hand)) return;

        // Check max splits (4 hands total)
        if (seat.hands.length >= 4) {
            this.sendToConnection(sender, { type: "error", message: "Max splits reached" });
            return;
        }

        // Check if player has enough chips
        if (seat.chips < hand.bet) {
            this.sendToConnection(sender, { type: "error", message: "Not enough chips to split" });
            return;
        }

        // Track strategy decision
        const handCanDouble = canDouble(hand) && seat.chips >= hand.bet;
        const handCanSurrender = hand.cards.length === 2 && !hand.isSplit;
        const isOptimal = this.trackStrategyDecision(seat.displayName, "split", hand, handCanDouble, true, handCanSurrender);

        // Broadcast action to all players
        this.broadcast({ type: "player_action", playerId: sender.id, action: "split", seatIndex, isOptimal });

        // Deduct chips for new hand
        seat.chips -= hand.bet;

        // Create new hand with second card
        const secondCard = hand.cards.pop()!;
        const newHand: Hand = {
            cards: [secondCard],
            bet: hand.bet,
            status: "playing",
            isDoubled: false,
            isSplit: true,
        };

        hand.isSplit = true;

        // Deal new cards to both hands
        const card1 = this.drawCard();
        const card2 = this.drawCard();
        hand.cards.push(card1);
        newHand.cards.push(card2);

        // Insert new hand after current
        seat.hands.splice(this.state.activeHandIndex + 1, 0, newHand);

        // Reset timer to full 10 seconds for the first split hand
        this.state.timerEndTime = Date.now() + TURN_TIME;
        this.state.timer = TURN_TIME;
        this.startTimer(TURN_TIME, () => this.onTurnTimeout());

        this.broadcastState();
    }

    // Insurance methods
    async startInsurancePhase() {
        this.state.phase = "insurance";
        this.state.timerEndTime = Date.now() + TURN_TIME;
        this.state.timer = TURN_TIME;

        // Mark all players with bets as needing to decide on insurance
        // We track this by keeping insuranceBet at 0 - they haven't decided yet
        // A value of -1 means they declined, >0 means they accepted

        this.broadcastState();
        await this.startTimer(TURN_TIME, () => this.onInsuranceTimeout());
    }

    async onInsuranceTimeout() {
        // Anyone who hasn't decided declines insurance
        for (const seat of this.state.seats) {
            if (seat.playerId && seat.bet > 0 && seat.insuranceBet === 0) {
                seat.insuranceBet = -1; // Declined
            }
        }
        await this.checkInsuranceComplete();
    }

    handleInsurance(accept: boolean, sender: Party.Connection) {
        if (this.state.phase !== "insurance") {
            this.sendToConnection(sender, { type: "error", message: "Insurance not available" });
            return;
        }

        const seatIndex = this.state.seats.findIndex((s) => s.playerId === sender.id);
        if (seatIndex === -1) return;

        const seat = this.state.seats[seatIndex];
        if (seat.bet <= 0 || seat.insuranceBet !== 0) {
            // No bet or already decided
            return;
        }

        if (accept) {
            // Insurance costs half the original bet
            const insuranceCost = Math.floor(seat.bet / 2);
            if (seat.chips >= insuranceCost) {
                seat.chips -= insuranceCost;
                seat.insuranceBet = insuranceCost;
            } else {
                // Not enough chips - treat as decline
                seat.insuranceBet = -1;
            }
        } else {
            seat.insuranceBet = -1; // Declined
        }

        this.broadcastState();
        this.checkInsuranceComplete();
    }

    async checkInsuranceComplete() {
        // Check if all players with bets have decided
        const needsDecision = this.state.seats.some(
            s => s.playerId && s.bet > 0 && s.insuranceBet === 0
        );

        if (needsDecision) return;

        await this.clearTimer();

        // Check if dealer has blackjack
        const dealerHasBJ = isBlackjack(this.state.dealerHand);

        if (dealerHasBJ) {
            // Dealer has blackjack - set phase to prevent player actions
            this.state.phase = "dealer_turn";

            // Reveal hole card
            this.state.dealerHand[1].faceUp = true;
            this.broadcastState();

            // Pay out insurance bets (2:1) and notify players
            for (let seatIndex = 0; seatIndex < this.state.seats.length; seatIndex++) {
                const seat = this.state.seats[seatIndex];
                if (seat.insuranceBet > 0) {
                    // Insurance pays 2:1, so player gets back bet + 2x bet = 3x
                    const payoutAmount = seat.insuranceBet * 3;
                    seat.chips += payoutAmount;

                    // Notify the player of insurance win
                    this.broadcast({
                        type: "insurance_payout",
                        seatIndex,
                        amount: payoutAmount
                    });
                }
            }

            // Go directly to payout (dealer blackjack beats all except player blackjacks)
            await this.startTimer(DEALING_DELAY, () => this.calculatePayouts());
        } else {
            // Dealer doesn't have blackjack - insurance bets are lost
            // Reset insurance flags and continue to player turns
            for (const seat of this.state.seats) {
                if (seat.insuranceBet === -1) {
                    seat.insuranceBet = 0;
                }
            }
            this.broadcastState();
            await this.startTimer(DEALING_DELAY, () => this.startPlayerTurns());
        }
    }

    drawCard(): Card {
        if (this.state.shoe.length === 0) {
            this.reshuffleShoe();
        }

        const card = this.state.shoe.pop()!;

        // Update Hi-Lo running count
        // 2-6 = +1, 7-9 = 0, 10-A = -1
        const rank = card.rank;
        if (['2', '3', '4', '5', '6'].includes(rank)) {
            this.state.runningCount += 1;
        } else if (['10', 'J', 'Q', 'K', 'A'].includes(rank)) {
            this.state.runningCount -= 1;
        }
        // 7, 8, 9 are neutral (0)

        // Check if we've passed the cut card
        if (this.state.shoe.length <= this.state.cutCardIndex) {
            this.state.needsReshuffle = true;
        }

        return { ...card, faceUp: true };
    }

    reshuffleShoe() {
        this.state.shoe = createShoe(6);
        this.state.cutCardIndex = Math.floor(this.state.shoe.length * 0.80);
        this.state.needsReshuffle = false;
        this.state.runningCount = 0; // Reset count on reshuffle
    }

    // Track whether player action matches basic strategy - returns isOptimal
    trackStrategyDecision(
        displayName: string,
        playerAction: Action,
        hand: Hand,
        canDoubleHand: boolean,
        canSplitHand: boolean,
        canSurrenderHand: boolean
    ): boolean {
        const dealerUpcard = this.state.dealerHand[0];
        if (!dealerUpcard) return true;

        const isOptimal = isOptimalAction(
            playerAction,
            hand,
            dealerUpcard,
            canDoubleHand,
            canSplitHand,
            canSurrenderHand
        );

        if (!this.strategyStats[displayName]) {
            this.strategyStats[displayName] = { correct: 0, total: 0 };
        }

        this.strategyStats[displayName].total++;
        if (isOptimal) {
            this.strategyStats[displayName].correct++;
        }

        return isOptimal;
    }

    async saveStrategyStats() {
        await this.room.storage.put("strategyStats", this.strategyStats);
    }

    async checkGameState() {
        const activePlayers = this.state.seats.filter((s) => s.playerId !== null);

        if (activePlayers.length === 0) {
            // No players, go to waiting
            this.state.phase = "waiting";
            await this.clearTimer();
            this.broadcastState();
            return;
        }

        if (this.state.phase === "waiting") {
            // Start betting phase
            await this.startBettingPhase();
        }
    }

    async startBettingPhase() {
        // Reshuffle if needed
        if (this.state.needsReshuffle) {
            this.reshuffleShoe();
        }

        // Reset betting timer flag
        this.bettingTimerStarted = false;

        // Reset player hands and auto-bet previous amount
        let anyBetsPlaced = false;
        for (const seat of this.state.seats) {
            if (seat.playerId) {
                seat.hands = [];
                seat.status = "waiting";

                // Auto-bet the previous bet, or max chips if not enough
                if (seat.lastBet > 0 && seat.chips > 0) {
                    seat.bet = Math.min(seat.lastBet, seat.chips);
                    seat.status = "betting";
                    anyBetsPlaced = true;
                } else {
                    seat.bet = 0;
                }
            }
        }

        this.state.dealerHand = [];
        this.state.phase = "betting";
        this.state.activePlayerIndex = -1;
        this.state.activeHandIndex = 0;

        // If we auto-bet, start the timer
        if (anyBetsPlaced) {
            this.bettingTimerStarted = true;
            this.state.timerEndTime = Date.now() + BETTING_TIME;
            this.state.timer = BETTING_TIME;
            await this.startTimer(BETTING_TIME, () => this.onBettingEnd());
        } else {
            // Don't set timer yet - it starts when first bet is placed
            this.state.timerEndTime = null;
            this.state.timer = 0;
        }

        this.broadcastState();
    }

    onBettingEnd() {
        // Check which players placed bets
        const playersWithBets = this.state.seats.filter((s) => s.playerId && s.bet > 0);

        if (playersWithBets.length === 0) {
            // No bets, restart betting
            this.startBettingPhase();
            return;
        }

        // Deduct bets from chips and start dealing
        for (const seat of this.state.seats) {
            if (seat.playerId && seat.bet > 0) {
                // Save the bet for next round auto-bet
                seat.lastBet = seat.bet;
                seat.chips -= seat.bet;
                seat.hands = [
                    {
                        cards: [],
                        bet: seat.bet,
                        status: "playing",
                        isDoubled: false,
                        isSplit: false,
                    },
                ];
                seat.status = "playing";
            }
        }

        this.dealInitialCards();
    }

    async dealInitialCards() {
        this.state.phase = "dealing";

        // Deal 2 cards to each player with bet, then 2 to dealer
        const seatsWithBets = this.state.seats
            .map((s, i) => ({ seat: s, index: i }))
            .filter((s) => s.seat.bet > 0);

        // First card to each player
        for (const { seat } of seatsWithBets) {
            const card = this.drawCard();
            seat.hands[0].cards.push(card);
        }

        // First card to dealer (face up)
        const dealerCard1 = this.drawCard();
        this.state.dealerHand.push(dealerCard1);

        // Second card to each player
        for (const { seat } of seatsWithBets) {
            const card = this.drawCard();
            seat.hands[0].cards.push(card);
        }

        // Second card to dealer (face down - hole card)
        const dealerCard2 = this.drawCard();
        dealerCard2.faceUp = false;
        this.state.dealerHand.push(dealerCard2);

        // Check for player blackjacks
        for (const { seat } of seatsWithBets) {
            if (isBlackjack(seat.hands[0].cards)) {
                seat.hands[0].status = "blackjack";
            }
        }

        // Reset insurance bets
        for (const seat of this.state.seats) {
            seat.insuranceBet = 0;
        }

        this.broadcastState();

        // Check if dealer shows Ace - offer insurance
        if (dealerCard1.rank === "A") {
            await this.startInsurancePhase();
        } else {
            // Check for dealer blackjack (with 10-value showing)
            const tenValues = ["10", "J", "Q", "K"];
            if (tenValues.includes(dealerCard1.rank) && isBlackjack(this.state.dealerHand)) {
                // Dealer has blackjack - set phase to prevent player actions
                this.state.phase = "dealer_turn";
                this.state.dealerHand[1].faceUp = true;
                this.broadcastState();
                await this.startTimer(DEALING_DELAY, () => this.calculatePayouts());
            } else {
                // Normal flow - start player turns
                await this.startTimer(DEALING_DELAY, () => this.startPlayerTurns());
            }
        }
    }

    async startPlayerTurns() {
        this.state.phase = "player_turn";
        this.state.activeHandIndex = 0;

        // Find first player who needs to act
        this.state.activePlayerIndex = this.findNextActivePlayer(-1);

        if (this.state.activePlayerIndex === -1) {
            // Everyone has blackjack or no active hands
            await this.startDealerTurn();
        } else {
            this.state.timerEndTime = Date.now() + TURN_TIME;
            this.state.timer = TURN_TIME;
            await this.startTimer(TURN_TIME, () => this.onTurnTimeout());
            this.broadcastState();
        }
    }

    findNextActivePlayer(currentIndex: number): number {
        for (let i = currentIndex + 1; i < 6; i++) {
            const seat = this.state.seats[i];
            if (seat.playerId && seat.hands.length > 0) {
                // Check if any hand needs action
                const hasActiveHand = seat.hands.some((h) => h.status === "playing");
                if (hasActiveHand) {
                    return i;
                }
            }
        }
        return -1;
    }

    async nextPlayerOrHand() {
        const seat = this.state.seats[this.state.activePlayerIndex];

        // Check if there are more hands to play for this player
        for (let i = this.state.activeHandIndex + 1; i < seat.hands.length; i++) {
            if (seat.hands[i].status === "playing") {
                this.state.activeHandIndex = i;
                this.state.timerEndTime = Date.now() + TURN_TIME;
                this.state.timer = TURN_TIME;
                await this.startTimer(TURN_TIME, () => this.onTurnTimeout());
                return;
            }
        }

        // Mark player as done
        seat.status = "done";

        // Find next player
        this.state.activePlayerIndex = this.findNextActivePlayer(this.state.activePlayerIndex);
        this.state.activeHandIndex = 0;

        if (this.state.activePlayerIndex === -1) {
            // All players done, dealer's turn
            await this.startDealerTurn();
        } else {
            // Find first active hand for new player
            const newSeat = this.state.seats[this.state.activePlayerIndex];
            for (let i = 0; i < newSeat.hands.length; i++) {
                if (newSeat.hands[i].status === "playing") {
                    this.state.activeHandIndex = i;
                    break;
                }
            }
            this.state.timerEndTime = Date.now() + TURN_TIME;
            this.state.timer = TURN_TIME;
            await this.startTimer(TURN_TIME, () => this.onTurnTimeout());
        }
    }

    onTurnTimeout() {
        // Auto-stand on timeout
        const seat = this.state.seats[this.state.activePlayerIndex];
        if (seat && seat.hands[this.state.activeHandIndex]) {
            seat.hands[this.state.activeHandIndex].status = "standing";
            this.nextPlayerOrHand();
            this.broadcastState();
        }
    }

    async startDealerTurn() {
        await this.clearTimer();
        this.state.phase = "dealer_turn";
        this.state.activePlayerIndex = -1;

        // Reveal hole card
        if (this.state.dealerHand[1]) {
            this.state.dealerHand[1].faceUp = true;
        }

        this.broadcastState();

        // Check if any players are still in (not all busted)
        const activePlayers = this.state.seats.filter(
            (s) => s.playerId && s.hands.some((h) => h.status === "standing" || h.status === "blackjack")
        );

        if (activePlayers.length === 0) {
            // All players busted, skip dealer play
            await this.calculatePayouts();
            return;
        }

        // Dealer plays
        await this.playDealerHand();
    }

    async playDealerHand() {
        const { value } = calculateHandValue(this.state.dealerHand);

        // Dealer stands on 17 or higher (including soft 17)
        if (value >= 17) {
            this.broadcastState();
            // Use alarm for delay before payouts
            await this.startTimer(DEALER_CARD_DELAY, () => this.calculatePayouts());
            return;
        }

        // Dealer hits
        const card = this.drawCard();
        this.state.dealerHand.push(card);
        this.broadcastState();

        // Use alarm for delay before next card
        await this.startTimer(DEALER_CARD_DELAY, () => this.playDealerHand());
    }

    async calculatePayouts() {
        this.state.phase = "payout";

        const { value: dealerValue } = calculateHandValue(this.state.dealerHand);
        const dealerBusted = dealerValue > 21;
        const dealerBlackjack = isBlackjack(this.state.dealerHand);

        for (let seatIndex = 0; seatIndex < 6; seatIndex++) {
            const seat = this.state.seats[seatIndex];
            if (!seat.playerId) continue;

            for (const hand of seat.hands) {
                if (hand.status === "busted") {
                    // Player already lost
                    this.broadcast({ type: "payout", seatIndex, amount: 0, result: "lose" });
                    continue;
                }

                if (hand.status === "surrendered") {
                    // Player surrendered - already got half bet back, no further payout
                    this.broadcast({ type: "payout", seatIndex, amount: 0, result: "lose" });
                    continue;
                }

                const { value: playerValue } = calculateHandValue(hand.cards);
                const playerBlackjack = hand.status === "blackjack";

                let payout = 0;
                let result: "win" | "lose" | "push" | "blackjack" = "lose";

                if (playerBlackjack && dealerBlackjack) {
                    // Push
                    payout = hand.bet;
                    result = "push";
                } else if (playerBlackjack) {
                    // Blackjack pays 3:2
                    payout = hand.bet + Math.floor(hand.bet * 1.5);
                    result = "blackjack";
                    // Track blackjack count for this player
                    this.blackjackCounts[seat.displayName] = (this.blackjackCounts[seat.displayName] || 0) + 1;
                } else if (dealerBlackjack) {
                    // Player loses
                    result = "lose";
                } else if (dealerBusted) {
                    // Player wins
                    payout = hand.bet * 2;
                    result = "win";
                } else if (playerValue > dealerValue) {
                    // Player wins
                    payout = hand.bet * 2;
                    result = "win";
                } else if (playerValue === dealerValue) {
                    // Push
                    payout = hand.bet;
                    result = "push";
                }

                seat.chips += payout;
                // For display purposes, show net gain (payout - original bet for push = 0)
                const displayAmount = result === "push" ? 0 : (result === "lose" ? 0 : payout - hand.bet);
                this.broadcast({ type: "payout", seatIndex, amount: displayAmount, result });
            }

            // Save updated chip balance to state
            this.state.chipBalances[seat.displayName] = seat.chips;
        }

        // Persist chip balances, strategy stats, and blackjack counts to durable storage
        await this.room.storage.put("chipBalances", this.state.chipBalances);
        await this.room.storage.put("blackjackCounts", this.blackjackCounts);
        await this.saveStrategyStats();

        this.state.timerEndTime = Date.now() + PAYOUT_TIME;
        this.broadcastState();

        // Use alarm to wait then start new round
        await this.startTimer(PAYOUT_TIME, async () => {
            // Check if any players still have chips
            const playersWithChips = this.state.seats.filter((s) => s.playerId && s.chips > 0);

            if (playersWithChips.length > 0) {
                await this.startBettingPhase();
            } else {
                this.state.phase = "waiting";
                this.broadcastState();
                await this.checkGameState();
            }
        });
    }

    async startTimer(duration: number, callback: () => void) {
        await this.clearTimer();
        this.timerCallback = callback;
        // Use PartyKit's alarm API for reliable timers
        await this.room.storage.setAlarm(Date.now() + duration);
    }

    async clearTimer() {
        this.timerCallback = null;
        await this.room.storage.deleteAlarm();
        this.state.timerEndTime = null;
        this.state.timer = 0;
    }

    broadcast(msg: ServerMessage) {
        this.room.broadcast(JSON.stringify(msg));
    }

    broadcastState() {
        this.state.lastUpdate = Date.now();
        this.broadcast({ type: "state_update", state: this.state });
    }

    sendToConnection(conn: Party.Connection, msg: ServerMessage) {
        conn.send(JSON.stringify(msg));
    }
}
