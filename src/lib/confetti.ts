"use client";

import confetti from "canvas-confetti";

// Confetti celebration for big wins ($500+)
export function celebrateWin(amount: number) {
    if (amount < 500) return;

    const duration = amount >= 1000 ? 4000 : 2000;
    const particleCount = amount >= 1000 ? 200 : 100;

    // Launch from bottom corners
    const defaults = {
        startVelocity: 30,
        spread: 360,
        ticks: 60,
        zIndex: 9999,
        colors: ["#fbbf24", "#22c55e", "#ef4444", "#3b82f6", "#a855f7"],
    };

    // Big burst from center
    confetti({
        ...defaults,
        particleCount,
        origin: { x: 0.5, y: 0.6 },
    });

    // Side bursts for extra effect on jackpots
    if (amount >= 1000) {
        setTimeout(() => {
            confetti({
                ...defaults,
                particleCount: 50,
                origin: { x: 0.2, y: 0.7 },
                angle: 60,
            });
            confetti({
                ...defaults,
                particleCount: 50,
                origin: { x: 0.8, y: 0.7 },
                angle: 120,
            });
        }, 300);
    }

    // Extended celebration for huge wins
    if (amount >= 2000) {
        const interval = setInterval(() => {
            confetti({
                ...defaults,
                particleCount: 30,
                origin: { x: Math.random(), y: Math.random() * 0.3 + 0.3 },
            });
        }, 400);

        setTimeout(() => clearInterval(interval), duration);
    }
}

// Golden confetti for blackjack
export function celebrateBlackjack() {
    confetti({
        particleCount: 100,
        spread: 70,
        origin: { x: 0.5, y: 0.5 },
        colors: ["#fbbf24", "#f59e0b", "#d97706", "#ffffff"],
        shapes: ["star", "circle"],
        ticks: 100,
        zIndex: 9999,
    });
}
