/* global AFRAME */

/**
 * Audio Analyzer System
 * Real-time audio analysis with Web Audio API
 * Exposes frequency band data for particle system reactivity
 */
AFRAME.registerSystem('audio-analyzer', {
    schema: {
        fftSize: { default: 1024 },  // 512 bins (fftSize/2) -> ~43Hz per bin
        smoothing: { default: 0.8 }
    },

    init: function () {
        this.audioContext = null;
        this.analyser = null;
        this.source = null;
        this.audio = null;
        this.frequencyData = null;
        this.isPlaying = false;

        // Frequency band values (normalized 0-1)
        this.bands = {
            bass: 0,    // 0-170Hz
            mid: 0,     // 300-2500Hz
            high: 0     // 4000Hz+
        };

        this.volume = 0; // Global average level

        // Beat Detection State
        this.isBeat = false;
        this.beatThreshold = 0;
        this.beatHold = false;
        this.beatTimer = 0;

        // Smoothed values for visual transitions
        this.smoothBands = { bass: 0, mid: 0, high: 0 };

        // Bind methods
        this.loadAudio = this.loadAudio.bind(this);
        this.play = this.play.bind(this);
        this.pause = this.pause.bind(this);

        console.log('[AudioAnalyzer] System initialized');
    },

    /**
     * Load audio from file URL or File object
     */
    loadAudio: function (source) {
        return new Promise((resolve, reject) => {
            // Create audio context on first load (requires user gesture)
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.analyser = this.audioContext.createAnalyser();
                this.analyser.fftSize = this.data.fftSize;
                this.analyser.smoothingTimeConstant = this.data.smoothing;
                this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
            }

            // Clean up previous source
            if (this.source) {
                this.source.disconnect();
            }
            if (this.audio) {
                this.audio.pause();
                this.audio = null;
            }

            // Create audio element
            this.audio = new Audio();
            this.audio.crossOrigin = 'anonymous';
            this.audio.loop = true;

            // Handle File object or URL
            if (source instanceof File) {
                this.audio.src = URL.createObjectURL(source);
            } else {
                this.audio.src = source;
            }

            this.audio.addEventListener('canplaythrough', () => {
                // Create media source and connect
                this.source = this.audioContext.createMediaElementSource(this.audio);
                this.source.connect(this.analyser);
                this.analyser.connect(this.audioContext.destination);

                console.log('[AudioAnalyzer] Audio loaded:', source instanceof File ? source.name : source);
                this.el.emit('audio-loaded');
                resolve();
            }, { once: true });

            this.audio.addEventListener('error', (e) => {
                console.error('[AudioAnalyzer] Failed to load audio:', e);
                reject(e);
            }, { once: true });

            this.audio.load();
        });
    },

    /**
     * Start playback
     */
    play: function () {
        if (this.audio && this.audioContext) {
            // Resume context if suspended (autoplay policy)
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            this.audio.play();
            this.isPlaying = true;
            this.el.emit('audio-play');
            console.log('[AudioAnalyzer] Playing');
        }
    },

    /**
     * Pause playback
     */
    pause: function () {
        if (this.audio) {
            this.audio.pause();
            this.isPlaying = false;
            this.el.emit('audio-pause');
        }
    },

    /**
     * Toggle play/pause
     */
    toggle: function () {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    },

    /**
     * Get current frequency bands (smoothed)
     */
    getBands: function () {
        return this.smoothBands;
    },

    /**
     * Get raw frequency bands (instant)
     */
    getRawBands: function () {
        return this.bands;
    },

    tick: function (time, delta) {
        if (!this.analyser || !this.isPlaying) return;

        // Get frequency data
        this.analyser.getByteFrequencyData(this.frequencyData);

        // Calculate band averages
        // Sample Rate ~44100Hz / 1024 = ~43Hz per bin

        const bins = this.frequencyData;

        // 1. BASS (Deep sub & kick)
        // Range: ~0 - 170Hz -> Bins 0-4
        let bassSum = 0;
        for (let i = 0; i < 4; i++) {
            bassSum += bins[i] || 0;
        }
        this.bands.bass = (bassSum / 4) / 255;

        // 2. MID (Vocals & instruments)
        // Range: ~300Hz - 2500Hz -> Bins 7 - 58
        let midSum = 0;
        let midCount = 0;
        for (let i = 7; i < 58; i++) {
            midSum += bins[i] || 0;
            midCount++;
        }
        this.bands.mid = (midSum / midCount) / 255;

        // 3. HIGH (Hi-hats, air)
        // Range: ~4000Hz+ -> Bins 90+
        let highSum = 0;
        let highCount = 0;
        for (let i = 90; i < this.analyser.frequencyBinCount; i++) {
            highSum += bins[i] || 0;
            highCount++;
        }
        this.bands.high = (highSum / highCount) / 255;

        // Boost highs artificially as they are often quiet
        this.bands.high = Math.min(this.bands.high * 3.0, 1.0);

        // 4. GLOBAL VOLUME (Average Level)
        this.volume = (this.bands.bass + this.bands.mid + this.bands.high) / 3.0;

        // 5. BEAT DETECTION (Simple Peak Detection)
        // Detects sudden spikes in Bass energy relative to a rolling average
        const instantEnergy = this.bands.bass;

        // Update local energy history (simple moving average for threshold)
        this.beatThreshold = this.beatThreshold * 0.95 + instantEnergy * 0.05;

        // If instant energy is significantly higher than average -> BEAT!
        if (instantEnergy > this.beatThreshold * 1.3 && instantEnergy > 0.3) {
            if (!this.beatHold) {
                this.isBeat = true;
                this.beatHold = true;
                // Emit event for other components to listen to
                this.el.emit('audio-beat', { level: instantEnergy });
            }
        } else {
            this.isBeat = false;
        }

        // Release beat hold after a short delay (prevent rapid-fire triggering)
        if (this.beatHold) {
            this.beatTimer += delta;
            if (this.beatTimer > 100) { // 100ms debounce
                this.beatHold = false;
                this.beatTimer = 0;
            }
        }

        // Smooth the values
        // 0.15 was too slow/smooth. 0.6 is snappier for beat detection.
        const smoothFactor = 0.6;
        this.smoothBands.bass += (this.bands.bass - this.smoothBands.bass) * smoothFactor;
        this.smoothBands.mid += (this.bands.mid - this.smoothBands.mid) * smoothFactor;
        this.smoothBands.high += (this.bands.high - this.smoothBands.high) * smoothFactor;
    }
});
