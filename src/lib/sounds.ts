import { Howl } from "howler";

// Sound effects manager with lazy loading for performance
class SoundManager {
    private sounds: Record<string, Howl> = {};
    private enabled: boolean = true;
    private preloaded: boolean = false;

    constructor() {
        if (typeof window !== "undefined") {
            // Lazy load sounds - don't block initial render
            this.sounds = {
                cardDeal: new Howl({
                    src: ["/sounds/card-deal.mp3"],
                    volume: 0.5,
                    preload: false,
                }),
                cardFlip: new Howl({
                    src: ["/sounds/card-flip.mp3"],
                    volume: 0.4,
                    preload: false,
                }),
                chipClick: new Howl({
                    src: ["/sounds/chip-click.mp3"],
                    volume: 0.6,
                    preload: false,
                }),
                chipCollect: new Howl({
                    src: ["/sounds/chip-collect.mp3"],
                    volume: 0.5,
                    preload: false,
                }),
                win: new Howl({
                    src: ["/sounds/win.mp3"],
                    volume: 0.5,
                    preload: false,
                }),
                lose: new Howl({
                    src: ["/sounds/lose.mp3"],
                    volume: 0.3,
                    preload: false,
                }),
                shuffle: new Howl({
                    src: ["/sounds/shuffle.mp3"],
                    volume: 0.4,
                    preload: false,
                }),
                timer: new Howl({
                    src: ["/sounds/timer.mp3"],
                    volume: 0.3,
                    preload: false,
                }),
                yourTurn: new Howl({
                    src: ["/sounds/your-turn.mp3"],
                    volume: 0.6,
                    preload: false,
                }),
            };
        }
    }

    // Preload all sounds after first user interaction
    preloadAll() {
        if (this.preloaded) return;
        this.preloaded = true;
        Object.values(this.sounds).forEach(sound => sound.load());
    }

    play(sound: keyof typeof this.sounds) {
        if (this.enabled && this.sounds[sound]) {
            // Ensure sounds are loaded on first play
            if (!this.preloaded) {
                this.preloadAll();
            }
            this.sounds[sound].play();
        }
    }

    toggle(): boolean {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    isEnabled(): boolean {
        return this.enabled;
    }

    setEnabled(enabled: boolean) {
        this.enabled = enabled;
    }

    getMuted(): boolean {
        return !this.enabled;
    }

    setMuted(muted: boolean) {
        this.enabled = !muted;
    }
}

// Singleton
export const sounds = typeof window !== "undefined" ? new SoundManager() : null;

