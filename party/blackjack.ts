import type * as Party from "partykit/server";
import {
    GameState,
    ClientMessage,
    ServerMessage,
    createInitialGameState,
    createShoe,
    createEmptySeat,
    calculateHandValue,
    isBlackjack,
    canSplit,
    canDouble,
    Hand,
    Card,
} from "../src/lib/gameTypes";

const INITIAL_CHIPS = 10000;
const BETTING_TIME = 15000; // 15 seconds
const TURN_TIME = 10000; // 10 seconds
const PAYOUT_TIME = 5000; // 5 seconds

export default class BlackjackServer implements Party.Server {
    state: GameState;
    timerCallback: (() => void) | null = null;

    constructor(readonly room: Party.Room) {
        this.state = createInitialGameState();
    }

    // PartyKit alarm handler - this is how timers work in PartyKit
    async onAlarm() {
        if (this.timerCallback) {
            const callback = this.timerCallback;
            this.timerCallback = null;
            callback();
        }
    }

    onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
        // Send current state to new connection
        this.sendToConnection(conn, { type: "state_update", state: this.state });
    }

    onClose(conn: Party.Connection) {
        // Check if this player was in a seat
        const seatIndex = this.state.seats.findIndex((s) => s.playerId === conn.id);
        if (seatIndex !== -1) {
            const seat = this.state.seats[seatIndex];
            // Save chip balance before leaving
            if (seat.displayName) {
                this.state.chipBalances[seat.displayName] = seat.chips;
            }
            this.state.seats[seatIndex] = createEmptySeat();
        }

        // Remove from spectators
        this.state.spectators = this.state.spectators.filter((s) => s.id !== conn.id);

        this.broadcastState();
        this.checkGameState();
    }

    onMessage(message: string, sender: Party.Connection) {
        try {
            const msg: ClientMessage = JSON.parse(message);
            this.handleMessage(msg, sender);
        } catch (e) {
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

            default:
                this.sendToConnection(sender, { type: "error", message: "Unknown message type" });
        }
    }

    handleJoinSeat(seatIndex: number, displayName: string, sender: Party.Connection) {
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
        const chips = this.state.chipBalances[displayName] ?? INITIAL_CHIPS;
        this.state.chipBalances[displayName] = chips;

        // Assign seat
        this.state.seats[seatIndex] = {
            playerId: sender.id,
            displayName,
            chips,
            bet: 0,
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
            this.state.spectators.push({ id: sender.id, name: displayName });
        }

        this.broadcastState();
        this.checkGameState();
    }

    handlePlaceBet(amount: number, sender: Party.Connection) {
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
        this.broadcastState();
    }

    handleClearBet(sender: Party.Connection) {
        if (this.state.phase !== "betting") return;

        const seatIndex = this.state.seats.findIndex((s) => s.playerId === sender.id);
        if (seatIndex === -1) return;

        this.state.seats[seatIndex].bet = 0;
        this.state.seats[seatIndex].status = "waiting";
        this.broadcastState();
    }

    handleHit(sender: Party.Connection) {
        if (this.state.phase !== "player_turn") return;

        const seatIndex = this.state.seats.findIndex((s) => s.playerId === sender.id);
        if (seatIndex === -1 || seatIndex !== this.state.activePlayerIndex) return;

        const seat = this.state.seats[seatIndex];
        const hand = seat.hands[this.state.activeHandIndex];
        if (!hand || hand.status !== "playing") return;

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

        hand.status = "standing";
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

        // Check if player has enough chips
        if (seat.chips < hand.bet * 2) {
            this.sendToConnection(sender, { type: "error", message: "Not enough chips to double" });
            return;
        }

        // Double the bet
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

        this.broadcastState();
    }

    drawCard(): Card {
        if (this.state.shoe.length === 0) {
            this.reshuffleShoe();
        }

        const card = this.state.shoe.pop()!;

        // Check if we've passed the cut card
        if (this.state.shoe.length <= this.state.cutCardIndex) {
            this.state.needsReshuffle = true;
        }

        return { ...card, faceUp: true };
    }

    reshuffleShoe() {
        this.state.shoe = createShoe(2);
        this.state.cutCardIndex = Math.floor(this.state.shoe.length * 0.75);
        this.state.needsReshuffle = false;
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

        // Reset player hands and bets
        for (const seat of this.state.seats) {
            if (seat.playerId) {
                seat.hands = [];
                seat.bet = 0;
                seat.status = "waiting";
            }
        }

        this.state.dealerHand = [];
        this.state.phase = "betting";
        this.state.activePlayerIndex = -1;
        this.state.activeHandIndex = 0;
        this.state.timerEndTime = Date.now() + BETTING_TIME;
        this.state.timer = BETTING_TIME;

        await this.startTimer(BETTING_TIME, () => this.onBettingEnd());
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

        // Second card to dealer (face down)
        const dealerCard2 = this.drawCard();
        dealerCard2.faceUp = false;
        this.state.dealerHand.push(dealerCard2);

        // Check for player blackjacks
        for (const { seat } of seatsWithBets) {
            if (isBlackjack(seat.hands[0].cards)) {
                seat.hands[0].status = "blackjack";
            }
        }

        this.broadcastState();

        // Small delay then start player turns (using alarm)
        await this.startTimer(1000, () => this.startPlayerTurns());
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
            await this.startTimer(1000, () => this.calculatePayouts());
            return;
        }

        // Dealer hits
        const card = this.drawCard();
        this.state.dealerHand.push(card);
        this.broadcastState();

        // Use alarm for delay before next card
        await this.startTimer(800, () => this.playDealerHand());
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
                this.broadcast({ type: "payout", seatIndex, amount: payout, result });
            }

            // Save updated chip balance
            this.state.chipBalances[seat.displayName] = seat.chips;
        }

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
