// Basic Strategy Tables for Blackjack
// Based on standard rules: Dealer stands on all 17s, 2-deck shoe, 3:2 blackjack

import { Card, Hand, calculateHandValue, Rank } from "./gameTypes";

export type Action = "hit" | "stand" | "double" | "split" | "surrender";

// Map dealer upcard to column index (2-A = 0-9)
function getDealerIndex(dealerUpcard: Card): number {
    const rank = dealerUpcard.rank;
    if (rank === "A") return 9;
    if (rank === "K" || rank === "Q" || rank === "J" || rank === "10") return 8;
    return parseInt(rank) - 2;
}

// Get numeric value for a rank
function getRankValue(rank: Rank): number {
    if (rank === "A") return 11;
    if (["K", "Q", "J"].includes(rank)) return 10;
    return parseInt(rank);
}

// Hard totals strategy (rows: 5-21, cols: dealer 2-A)
// H = Hit, S = Stand, D = Double (hit if can't), Ds = Double (stand if can't), Rh = Surrender (hit if can't)
const HARD_STRATEGY: Record<number, string[]> = {
    5: ["H", "H", "H", "H", "H", "H", "H", "H", "H", "H"],
    6: ["H", "H", "H", "H", "H", "H", "H", "H", "H", "H"],
    7: ["H", "H", "H", "H", "H", "H", "H", "H", "H", "H"],
    8: ["H", "H", "H", "H", "H", "H", "H", "H", "H", "H"],
    9: ["H", "D", "D", "D", "D", "H", "H", "H", "H", "H"],
    10: ["D", "D", "D", "D", "D", "D", "D", "D", "H", "H"],
    11: ["D", "D", "D", "D", "D", "D", "D", "D", "D", "D"],
    12: ["H", "H", "S", "S", "S", "H", "H", "H", "H", "H"],
    13: ["S", "S", "S", "S", "S", "H", "H", "H", "H", "H"],
    14: ["S", "S", "S", "S", "S", "H", "H", "H", "H", "H"],
    15: ["S", "S", "S", "S", "S", "H", "H", "H", "Rh", "H"],
    16: ["S", "S", "S", "S", "S", "H", "H", "Rh", "Rh", "Rh"],
    17: ["S", "S", "S", "S", "S", "S", "S", "S", "S", "S"],
    18: ["S", "S", "S", "S", "S", "S", "S", "S", "S", "S"],
    19: ["S", "S", "S", "S", "S", "S", "S", "S", "S", "S"],
    20: ["S", "S", "S", "S", "S", "S", "S", "S", "S", "S"],
    21: ["S", "S", "S", "S", "S", "S", "S", "S", "S", "S"],
};

// Soft totals strategy (rows: A,2 through A,9 = 13-20 soft, cols: dealer 2-A)
const SOFT_STRATEGY: Record<number, string[]> = {
    13: ["H", "H", "H", "D", "D", "H", "H", "H", "H", "H"],  // A,2
    14: ["H", "H", "H", "D", "D", "H", "H", "H", "H", "H"],  // A,3
    15: ["H", "H", "D", "D", "D", "H", "H", "H", "H", "H"],  // A,4
    16: ["H", "H", "D", "D", "D", "H", "H", "H", "H", "H"],  // A,5
    17: ["H", "D", "D", "D", "D", "H", "H", "H", "H", "H"],  // A,6
    18: ["Ds", "Ds", "Ds", "Ds", "Ds", "S", "S", "H", "H", "H"],  // A,7
    19: ["S", "S", "S", "S", "Ds", "S", "S", "S", "S", "S"],  // A,8
    20: ["S", "S", "S", "S", "S", "S", "S", "S", "S", "S"],  // A,9
};

// Pair splitting strategy (rows: pair value, cols: dealer 2-A)
// Y = Split, N = Don't split, Y/N = Split only if DAS (Double After Split) allowed
const PAIR_STRATEGY: Record<number, string[]> = {
    2: ["Y", "Y", "Y", "Y", "Y", "Y", "N", "N", "N", "N"],  // 2,2
    3: ["Y", "Y", "Y", "Y", "Y", "Y", "N", "N", "N", "N"],  // 3,3
    4: ["N", "N", "N", "Y", "Y", "N", "N", "N", "N", "N"],  // 4,4
    5: ["N", "N", "N", "N", "N", "N", "N", "N", "N", "N"],  // 5,5 (treat as 10)
    6: ["Y", "Y", "Y", "Y", "Y", "N", "N", "N", "N", "N"],  // 6,6
    7: ["Y", "Y", "Y", "Y", "Y", "Y", "N", "N", "N", "N"],  // 7,7
    8: ["Y", "Y", "Y", "Y", "Y", "Y", "Y", "Y", "Y", "Y"],  // 8,8
    9: ["Y", "Y", "Y", "Y", "Y", "N", "Y", "Y", "N", "N"],  // 9,9
    10: ["N", "N", "N", "N", "N", "N", "N", "N", "N", "N"],  // 10,10
    11: ["Y", "Y", "Y", "Y", "Y", "Y", "Y", "Y", "Y", "Y"],  // A,A
};

/**
 * Gets the optimal action according to basic strategy
 */
export function getOptimalAction(
    hand: Hand,
    dealerUpcard: Card,
    canDouble: boolean,
    canSplit: boolean,
    canSurrender: boolean
): Action {
    const cards = hand.cards;
    const { value, isSoft } = calculateHandValue(cards);
    const dealerIdx = getDealerIndex(dealerUpcard);

    // Check for pair splitting first
    if (cards.length === 2 && canSplit) {
        const rank1 = cards[0].rank;
        const rank2 = cards[1].rank;

        // Check if it's a valid pair
        const val1 = getRankValue(rank1);
        const val2 = getRankValue(rank2);

        if (val1 === val2 || (rank1 === rank2)) {
            const pairValue = rank1 === "A" ? 11 : val1;
            const pairRow = PAIR_STRATEGY[pairValue];
            if (pairRow && pairRow[dealerIdx] === "Y") {
                return "split";
            }
        }
    }

    // Soft hands (contain Ace counted as 11)
    if (isSoft && value >= 13 && value <= 20) {
        const softRow = SOFT_STRATEGY[value];
        if (softRow) {
            const action = softRow[dealerIdx];
            if (action === "D" && canDouble) return "double";
            if (action === "D" && !canDouble) return "hit";
            if (action === "Ds" && canDouble) return "double";
            if (action === "Ds" && !canDouble) return "stand";
            if (action === "H") return "hit";
            if (action === "S") return "stand";
        }
    }

    // Hard hands
    const hardValue = Math.min(Math.max(value, 5), 21);
    const hardRow = HARD_STRATEGY[hardValue];
    if (hardRow) {
        const action = hardRow[dealerIdx];
        if (action === "D" && canDouble) return "double";
        if (action === "D" && !canDouble) return "hit";
        if (action === "Rh" && canSurrender) return "surrender";
        if (action === "Rh" && !canSurrender) return "hit";
        if (action === "H") return "hit";
        if (action === "S") return "stand";
    }

    // Default fallback
    return value >= 17 ? "stand" : "hit";
}

/**
 * Checks if player's action matches optimal basic strategy
 */
export function isOptimalAction(
    playerAction: Action,
    hand: Hand,
    dealerUpcard: Card,
    canDouble: boolean,
    canSplit: boolean,
    canSurrender: boolean
): boolean {
    const optimal = getOptimalAction(hand, dealerUpcard, canDouble, canSplit, canSurrender);
    return playerAction === optimal;
}
