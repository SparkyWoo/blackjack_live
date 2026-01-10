// Card and deck utilities
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
    suit: Suit;
    rank: Rank;
    faceUp: boolean;
}

export interface Hand {
    cards: Card[];
    bet: number;
    status: 'playing' | 'standing' | 'busted' | 'blackjack' | 'doubled';
    isDoubled: boolean;
    isSplit: boolean;
}

export interface Seat {
    playerId: string | null;
    displayName: string;
    chips: number;
    bet: number;
    hands: Hand[];
    status: 'empty' | 'waiting' | 'betting' | 'playing' | 'done';
}

export type GamePhase = 'waiting' | 'betting' | 'dealing' | 'player_turn' | 'dealer_turn' | 'payout';

export interface GameState {
    phase: GamePhase;
    shoe: Card[];
    cutCardIndex: number;
    needsReshuffle: boolean;
    dealerHand: Card[];
    seats: Seat[];
    activePlayerIndex: number;
    activeHandIndex: number;
    timer: number;
    timerEndTime: number | null;
    spectators: { id: string; name: string }[];
    chipBalances: Record<string, number>; // persisted by display name
    lastUpdate: number;
}

// Message types from client to server
export type ClientMessage =
    | { type: 'join_seat'; seatIndex: number; displayName: string }
    | { type: 'leave_seat' }
    | { type: 'spectate'; displayName: string }
    | { type: 'place_bet'; amount: number }
    | { type: 'clear_bet' }
    | { type: 'hit' }
    | { type: 'stand' }
    | { type: 'double' }
    | { type: 'split' }
    | { type: 'request_state' };

// Message types from server to client
export type ServerMessage =
    | { type: 'state_update'; state: GameState }
    | { type: 'error'; message: string }
    | { type: 'player_action'; playerId: string; action: string; seatIndex: number }
    | { type: 'card_dealt'; target: 'player' | 'dealer'; seatIndex?: number; handIndex?: number; card: Card }
    | { type: 'payout'; seatIndex: number; amount: number; result: 'win' | 'lose' | 'push' | 'blackjack' };

// Card utilities
export function createDeck(): Card[] {
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const deck: Card[] = [];

    for (const suit of suits) {
        for (const rank of ranks) {
            deck.push({ suit, rank, faceUp: true });
        }
    }

    return deck;
}

export function createShoe(numDecks: number = 2): Card[] {
    const shoe: Card[] = [];
    for (let i = 0; i < numDecks; i++) {
        shoe.push(...createDeck());
    }
    return shuffleArray(shoe);
}

export function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export function getCardValue(card: Card): number[] {
    if (card.rank === 'A') return [1, 11];
    if (['K', 'Q', 'J'].includes(card.rank)) return [10];
    return [parseInt(card.rank)];
}

export function calculateHandValue(cards: Card[]): { value: number; isSoft: boolean } {
    let total = 0;
    let aces = 0;

    for (const card of cards) {
        if (!card.faceUp) continue;

        if (card.rank === 'A') {
            aces++;
            total += 11;
        } else if (['K', 'Q', 'J'].includes(card.rank)) {
            total += 10;
        } else {
            total += parseInt(card.rank);
        }
    }

    // Convert aces from 11 to 1 if busting
    while (total > 21 && aces > 0) {
        total -= 10;
        aces--;
    }

    return { value: total, isSoft: aces > 0 };
}

export function isBlackjack(cards: Card[]): boolean {
    if (cards.length !== 2) return false;
    const { value } = calculateHandValue(cards);
    return value === 21;
}

export function canSplit(hand: Hand): boolean {
    if (hand.cards.length !== 2) return false;
    if (hand.isSplit) return false; // Already split hands can't split again for simplicity
    const rank1 = hand.cards[0].rank;
    const rank2 = hand.cards[1].rank;
    // Can split if same rank or both are 10-value cards
    if (rank1 === rank2) return true;
    const tenValues = ['10', 'J', 'Q', 'K'];
    return tenValues.includes(rank1) && tenValues.includes(rank2);
}

export function canDouble(hand: Hand): boolean {
    return hand.cards.length === 2 && !hand.isDoubled;
}

export function createEmptySeat(): Seat {
    return {
        playerId: null,
        displayName: '',
        chips: 0,
        bet: 0,
        hands: [],
        status: 'empty'
    };
}

export function createInitialGameState(): GameState {
    const shoe = createShoe(2);
    return {
        phase: 'waiting',
        shoe,
        cutCardIndex: Math.floor(shoe.length * 0.75),
        needsReshuffle: false,
        dealerHand: [],
        seats: Array.from({ length: 6 }, () => createEmptySeat()),
        activePlayerIndex: -1,
        activeHandIndex: 0,
        timer: 0,
        timerEndTime: null,
        spectators: [],
        chipBalances: {},
        lastUpdate: Date.now()
    };
}
