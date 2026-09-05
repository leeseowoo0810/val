/**
 * Valorant-style Web Audio API Sound Synthesizer
 * Zero external audio assets required - fully procedural, zero-latency.
 */
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.masterVolume = 0.7;
        this.isMuted = false;
        this.streak = 0;
        this.lastKillTime = 0;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setVolume(val) {
        this.masterVolume = Math.max(0, Math.min(1, val));
    }

    // Vandal Fire Sound: heavy punch + metallic clack + bass drop + tail
    playVandalShot() {
        if (this.isMuted) return;
        this.init();
        const ctx = this.ctx;
        const now = ctx.currentTime;

        const mainGain = ctx.createGain();
        mainGain.gain.setValueAtTime(this.masterVolume * 0.9, now);
        mainGain.connect(ctx.destination);

        // 1. Heavy Low Punch (Sine pitch drop 160Hz -> 35Hz)
        const punchOsc = ctx.createOscillator();
        const punchGain = ctx.createGain();
        punchOsc.type = 'triangle';
        punchOsc.frequency.setValueAtTime(180, now);
        punchOsc.frequency.exponentialRampToValueAtTime(30, now + 0.12);
        
        punchGain.gain.setValueAtTime(1.0, now);
        punchGain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

        punchOsc.connect(punchGain);
        punchGain.connect(mainGain);
        punchOsc.start(now);
        punchOsc.stop(now + 0.2);

        // 2. Gunpowder Mechanical Crack (Filtered Noise)
        const bufferSize = ctx.sampleRate * 0.15;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.03));
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;

        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(1200, now);
        noiseFilter.Q.setValueAtTime(3, now);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.8, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

        whiteNoise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(mainGain);
        whiteNoise.start(now);
        whiteNoise.stop(now + 0.15);

        // 3. Metallic High Snap
        const snapOsc = ctx.createOscillator();
        const snapGain = ctx.createGain();
        snapOsc.type = 'sawtooth';
        snapOsc.frequency.setValueAtTime(800, now);
        snapOsc.frequency.exponentialRampToValueAtTime(120, now + 0.06);

        snapGain.gain.setValueAtTime(0.4, now);
        snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

        snapOsc.connect(snapGain);
        snapGain.connect(mainGain);
        snapOsc.start(now);
        snapOsc.stop(now + 0.08);
    }

    // Phantom Fire Sound: Silenced suppressed pop + crisp sub-punch + air puff
    playPhantomShot() {
        if (this.isMuted) return;
        this.init();
        const ctx = this.ctx;
        const now = ctx.currentTime;

        const mainGain = ctx.createGain();
        mainGain.gain.setValueAtTime(this.masterVolume * 0.85, now);
        mainGain.connect(ctx.destination);

        // 1. Silenced Suppressed "Thwack" (Tight punch 220Hz -> 50Hz)
        const thwackOsc = ctx.createOscillator();
        const thwackGain = ctx.createGain();
        thwackOsc.type = 'sine';
        thwackOsc.frequency.setValueAtTime(240, now);
        thwackOsc.frequency.exponentialRampToValueAtTime(45, now + 0.07);

        thwackGain.gain.setValueAtTime(1.1, now);
        thwackGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

        thwackOsc.connect(thwackGain);
        thwackGain.connect(mainGain);
        thwackOsc.start(now);
        thwackOsc.stop(now + 0.09);

        // 2. Suppressor Air Hiss / High Whisper Noise
        const bufferSize = ctx.sampleRate * 0.1;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.018));
        }

        const hissSource = ctx.createBufferSource();
        hissSource.buffer = noiseBuffer;

        const hissFilter = ctx.createBiquadFilter();
        hissFilter.type = 'bandpass';
        hissFilter.frequency.setValueAtTime(2800, now);
        hissFilter.Q.setValueAtTime(2.5, now);

        const hissGain = ctx.createGain();
        hissGain.gain.setValueAtTime(0.65, now);
        hissGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

        hissSource.connect(hissFilter);
        hissFilter.connect(hissGain);
        hissGain.connect(mainGain);
        hissSource.start(now);
        hissSource.stop(now + 0.08);

        // 3. Crisp Metallic Bolt Click
        const clickOsc = ctx.createOscillator();
        const clickGain = ctx.createGain();
        clickOsc.type = 'triangle';
        clickOsc.frequency.setValueAtTime(1600, now);
        clickOsc.frequency.exponentialRampToValueAtTime(300, now + 0.035);

        clickGain.gain.setValueAtTime(0.5, now);
        clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        clickOsc.connect(clickGain);
        clickGain.connect(mainGain);
        clickOsc.start(now);
        clickOsc.stop(now + 0.045);
    }

    // Weapon Equip / Swap sound
    playWeaponEquip() {
        if (this.isMuted) return;
        this.init();
        const ctx = this.ctx;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(350, now);
        osc.frequency.exponentialRampToValueAtTime(900, now + 0.08);

        gain.gain.setValueAtTime(this.masterVolume * 0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.13);
    }

    // Realistic Reload: 1. Mag Release & Drop Sound
    playReloadMagOut() {
        if (this.isMuted) return;
        this.init();
        const ctx = this.ctx;
        const now = ctx.currentTime;

        // Spring latch click
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(1400, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);

        gain.gain.setValueAtTime(this.masterVolume * 0.45, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.07);

        // Plastic sliding noise
        const bufferSize = ctx.sampleRate * 0.08;
        const noiseBuf = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = noiseBuf.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.02));
        const noiseSrc = ctx.createBufferSource();
        noiseSrc.buffer = noiseBuf;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1800, now);
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(this.masterVolume * 0.3, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        noiseSrc.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noiseSrc.start(now);
        noiseSrc.stop(now + 0.09);
    }

    // Realistic Reload: 2. Mag In Heavy Slam Sound
    playReloadMagIn() {
        if (this.isMuted) return;
        this.init();
        const ctx = this.ctx;
        const now = ctx.currentTime;

        // Heavy magwell thump
        const lowOsc = ctx.createOscillator();
        const lowGain = ctx.createGain();
        lowOsc.type = 'sine';
        lowOsc.frequency.setValueAtTime(260, now);
        lowOsc.frequency.exponentialRampToValueAtTime(60, now + 0.08);

        lowGain.gain.setValueAtTime(this.masterVolume * 0.8, now);
        lowGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        lowOsc.connect(lowGain);
        lowGain.connect(ctx.destination);
        lowOsc.start(now);
        lowOsc.stop(now + 0.12);

        // Crisp metallic latch click
        const clickOsc = ctx.createOscillator();
        const clickGain = ctx.createGain();
        clickOsc.type = 'triangle';
        clickOsc.frequency.setValueAtTime(2200, now);
        clickOsc.frequency.exponentialRampToValueAtTime(600, now + 0.04);

        clickGain.gain.setValueAtTime(this.masterVolume * 0.6, now);
        clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        clickOsc.connect(clickGain);
        clickGain.connect(ctx.destination);
        clickOsc.start(now);
        clickOsc.stop(now + 0.06);
    }

    // Realistic Reload: 3. Bolt Rack / Charging Handle Pull Sound
    playReloadBoltRack() {
        if (this.isMuted) return;
        this.init();
        const ctx = this.ctx;
        const now = ctx.currentTime;

        // Pull back click
        const pullOsc = ctx.createOscillator();
        const pullGain = ctx.createGain();
        pullOsc.type = 'sawtooth';
        pullOsc.frequency.setValueAtTime(1100, now);
        pullOsc.frequency.exponentialRampToValueAtTime(350, now + 0.05);

        pullGain.gain.setValueAtTime(this.masterVolume * 0.45, now);
        pullGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        pullOsc.connect(pullGain);
        pullGain.connect(ctx.destination);
        pullOsc.start(now);
        pullOsc.stop(now + 0.07);

        // Release / slam forward click (slightly delayed)
        const forwardTime = now + 0.08;
        const forwardOsc = ctx.createOscillator();
        const forwardGain = ctx.createGain();
        forwardOsc.type = 'square';
        forwardOsc.frequency.setValueAtTime(1800, forwardTime);
        forwardOsc.frequency.exponentialRampToValueAtTime(500, forwardTime + 0.05);

        forwardGain.gain.setValueAtTime(this.masterVolume * 0.65, forwardTime);
        forwardGain.gain.exponentialRampToValueAtTime(0.001, forwardTime + 0.06);

        forwardOsc.connect(forwardGain);
        forwardGain.connect(ctx.destination);
        forwardOsc.start(forwardTime);
        forwardOsc.stop(forwardTime + 0.07);
    }

    // Valorant Signature Headshot "DING!" Kill Chime
    playHeadshotKill(combo = 1) {
        if (this.isMuted) return;
        this.init();
        const ctx = this.ctx;
        const now = ctx.currentTime;

        const mainGain = ctx.createGain();
        mainGain.gain.setValueAtTime(this.masterVolume, now);
        mainGain.connect(ctx.destination);

        const pitchMultiplier = Math.min(1.8, 1.0 + (combo - 1) * 0.08);

        const freqs = [1568 * pitchMultiplier, 2349 * pitchMultiplier, 3136 * pitchMultiplier, 4698 * pitchMultiplier];
        const weights = [0.7, 0.4, 0.3, 0.2];

        freqs.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.98, now + 0.6);

            const initialVol = weights[idx] * 0.8;
            gain.gain.setValueAtTime(initialVol, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55 + idx * 0.1);

            osc.connect(gain);
            gain.connect(mainGain);
            osc.start(now);
            osc.stop(now + 0.7);
        });

        const clickOsc = ctx.createOscillator();
        const clickGain = ctx.createGain();
        clickOsc.type = 'square';
        clickOsc.frequency.setValueAtTime(3200 * pitchMultiplier, now);
        clickOsc.frequency.exponentialRampToValueAtTime(800, now + 0.04);
        clickGain.gain.setValueAtTime(0.5, now);
        clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        clickOsc.connect(clickGain);
        clickGain.connect(mainGain);
        clickOsc.start(now);
        clickOsc.stop(now + 0.06);

        this.playKillThump(now, pitchMultiplier);
    }

    // Body shot hit sound
    playBodyShotHit() {
        if (this.isMuted) return;
        this.init();
        const ctx = this.ctx;
        const now = ctx.currentTime;

        const mainGain = ctx.createGain();
        mainGain.gain.setValueAtTime(this.masterVolume * 0.6, now);
        mainGain.connect(ctx.destination);

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);

        gain.gain.setValueAtTime(0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);

        osc.connect(gain);
        gain.connect(mainGain);
        osc.start(now);
        osc.stop(now + 0.1);
    }

    // Deep sub-bass kill announcement thump
    playKillThump(now, pitchMult = 1.0) {
        const ctx = this.ctx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(90 * pitchMult, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.35);

        gain.gain.setValueAtTime(this.masterVolume * 0.7, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.45);
    }

    // Target spawn futuristic whoosh
    playSpawnSound() {
        if (this.isMuted) return;
        this.init();
        const ctx = this.ctx;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(750, now + 0.1);

        gain.gain.setValueAtTime(this.masterVolume * 0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.16);
    }

    // Countdown beeps
    playCountdown(isStart = false) {
        if (this.isMuted) return;
        this.init();
        const ctx = this.ctx;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = isStart ? 'triangle' : 'sine';
        const freq = isStart ? 880 : 440;
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(this.masterVolume * 0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (isStart ? 0.35 : 0.15));

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + (isStart ? 0.4 : 0.2));
    }

    // UI Click sound
    playUIClick() {
        if (this.isMuted) return;
        this.init();
        const ctx = this.ctx;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.03);

        gain.gain.setValueAtTime(this.masterVolume * 0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
    }
}

window.soundEngine = new SoundEngine();
