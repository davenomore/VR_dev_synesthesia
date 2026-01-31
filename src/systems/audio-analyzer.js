/* global AFRAME */

/**
 * Audio Analyzer System
 * Real-time audio analysis with Web Audio API
 * Exposes frequency band data for particle system reactivity
 */
AFRAME.registerSystem('audio-analyzer', {
    schema: {
        fftSize: { default: 64 },  // 32 bins (fftSize/2)
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
            bass: 0,    // 20-100Hz (bins 0-2)
            mid: 0,     // 500-2000Hz (bins 8-16)
            high: 0     // 5k-15kHz (bins 20-30)
        };

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
        // FFT bins map to frequencies: bin * sampleRate / fftSize
        // With 44100Hz and fftSize=64: each bin ≈ 689Hz
        // We'll approximate the ranges

        const bins = this.frequencyData;
        const numBins = bins.length; // 32

        // Sub-bass (bins 0-1, ~0-1400Hz, we focus on first 2)
        let bassSum = 0;
        for (let i = 0; i < 2; i++) {
            bassSum += bins[i] || 0;
        }
        this.bands.bass = (bassSum / 2) / 255;

        // Mid range (bins 4-12, ~2800-8300Hz)
        let midSum = 0;
        for (let i = 4; i < 12; i++) {
            midSum += bins[i] || 0;
        }
        this.bands.mid = (midSum / 8) / 255;

        // High end (bins 16-28, ~11k-19kHz)
        let highSum = 0;
        for (let i = 16; i < Math.min(28, numBins); i++) {
            highSum += bins[i] || 0;
        }
        this.bands.high = (highSum / 12) / 255;

        // Smooth the values
        const smoothFactor = 0.15;
        this.smoothBands.bass += (this.bands.bass - this.smoothBands.bass) * smoothFactor;
        this.smoothBands.mid += (this.bands.mid - this.smoothBands.mid) * smoothFactor;
        this.smoothBands.high += (this.bands.high - this.smoothBands.high) * smoothFactor;
    }
});
