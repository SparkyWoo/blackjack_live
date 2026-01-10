import { Howl } from "howler";

// Sound effects manager
class SoundManager {
    private sounds: Record<string, Howl> = {};
    private enabled: boolean = true;

    constructor() {
        if (typeof window !== "undefined") {
            this.sounds = {
                cardDeal: new Howl({
                    src: ["/sounds/card-deal.mp3"],
                    volume: 0.5,
                }),
                cardFlip: new Howl({
                    src: ["/sounds/card-flip.mp3"],
                    volume: 0.4,
                }),
                chipClick: new Howl({
                    src: ["/sounds/chip-click.mp3"],
                    volume: 0.6,
                }),
                chipCollect: new Howl({
                    src: ["/sounds/chip-collect.mp3"],
                    volume: 0.5,
                }),
                win: new Howl({
                    src: ["/sounds/win.mp3"],
                    volume: 0.5,
                }),
                lose: new Howl({
                    src: ["/sounds/lose.mp3"],
                    volume: 0.3,
                }),
                shuffle: new Howl({
                    src: ["/sounds/shuffle.mp3"],
                    volume: 0.4,
                }),
                timer: new Howl({
                    src: ["/sounds/timer.mp3"],
                    volume: 0.3,
                }),
            };
        }
    }

    play(sound: keyof typeof this.sounds) {
        if (this.enabled && this.sounds[sound]) {
            this.sounds[sound].play();
        }
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    isEnabled() {
        return this.enabled;
    }

    setEnabled(enabled: boolean) {
        this.enabled = enabled;
    }
}

// Singleton
export const sounds = typeof window !== "undefined" ? new SoundManager() : null;
