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
const BETTING_TIME = 5000; // 5 seconds - restarts on every bet change
const TURN_TIME = 10000; // 10 seconds
const PAYOUT_TIME = 2000; // 2 seconds (reduced from 5 for snappier feel)
const DEALER_CARD_DELAY = 400; // 400ms between dealer cards (reduced from 800)
const DEALING_DELAY = 500; // 500ms after dealing before player turns (reduced from 1000)

export default class BlackjackServer implements Party.Server {
    state: GameState;
    timerCallback: (() => void) | null = null;
    bettingTimerStarted: boolean = false;

    constructor(readonly room: Party.Room) {
        this.state = createInitialGameState();
    }

    // Load persisted chip balances when server starts
    async onStart() {
        const storedBalances = await this.room.storage.get<Record<string, number>>("chipBalances");
        if (storedBalances) {
            this.state.chipBalances = storedBalances;
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

            case "insurance":
                this.handleInsurance(msg.accept, sender);
                break;

            case "surrender":
                this.handleSurrender(sender);
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
            // Reveal hole card
            this.state.dealerHand[1].faceUp = true;
            this.broadcastState();

            // Pay out insurance bets (2:1)
            for (const seat of this.state.seats) {
                if (seat.insuranceBet > 0) {
                    // Insurance pays 2:1, so player gets back bet + 2x bet = 3x
                    seat.chips += seat.insuranceBet * 3;
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
                // Dealer has blackjack - reveal and go to payout
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

            // Save updated chip balance to state
            this.state.chipBalances[seat.displayName] = seat.chips;
        }

        // Persist chip balances to durable storage
        await this.room.storage.put("chipBalances", this.state.chipBalances);

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
