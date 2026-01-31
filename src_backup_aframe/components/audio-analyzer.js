/* global AFRAME, THREE */

/**
 * Audio Reactive Component
 * Analyzes audio input (microphone or file) and provides frequency data to the scene.
 * 
 * Usage:
 * <a-scene audio-reactive="src: #music; fftSize: 2048"></a-scene>
 */
AFRAME.registerComponent('audio-reactive', {
    schema: {
        src: { type: 'selector' }, // Optional: Audio element selector
        fftSize: { type: 'int', default: 2048 },
        smoothing: { type: 'number', default: 0.8 },
        enabled: { type: 'boolean', default: true }
    },

    init: function () {
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.source = null;
        this.isAudioRunning = false;
        
        // Bind methods
        this.startAudio = this.startAudio.bind(this);
        this.onEnterVR = this.onEnterVR.bind(this);
        
        // Listen for user interaction to start audio (browser policy)
        ['click', 'touchstart', 'enter-vr'].forEach(event => {
            window.addEventListener(event, this.startAudio, { once: true });
        });
        
        this.el.addEventListener('enter-vr', this.onEnterVR);
    },

    initAudioContext: function () {
        if (this.audioContext) return;

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioContext();
        
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = this.data.fftSize;
        this.analyser.smoothingTimeConstant = this.data.smoothing;
        
        this.bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(this.bufferLength);

        if (this.data.src) {
            // Media Element Source (Music file)
            const audioElement = this.data.src;
            // Ensure crossOrigin is set if needed, though usually local/same-origin
            if (audioElement.tagName === 'AUDIO' || audioElement.tagName === 'VIDEO') {
                this.source = this.audioContext.createMediaElementSource(audioElement);
                this.source.connect(this.analyser);
                this.analyser.connect(this.audioContext.destination); // Output to speakers
            }
        } else {
            // Microphone Input
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                console.log("Requesting microphone access...");
                navigator.mediaDevices.getUserMedia({ audio: true })
                    .then(stream => {
                        console.log("Microphone access granted");
                        this.source = this.audioContext.createMediaStreamSource(stream);
                        this.source.connect(this.analyser);
                        // Do NOT connect mic to destination to avoid feedback loop
                    })
                    .catch(err => console.error('Microphone access denied:', err));
            }
        }

        this.isAudioRunning = true;
        console.log("Audio Context Initialized");
    },
    
    startAudio: function() {
        if (!this.data.enabled) return;
        
        // Resume context if suspended (browser policy)
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume().then(() => {
                console.log("Audio Context Resumed");
            });
        }
        
        // Initialize if not already
        if (!this.audioContext) {
            this.initAudioContext();
        }
    },
    
    onEnterVR: function () {
        this.startAudio();
    },

    tick: function () {
        if (!this.isAudioRunning || !this.analyser) return;

        this.analyser.getByteFrequencyData(this.dataArray);
        
        // Calculate frequency bands
        const bass = this.getAverageFrequency(0, 10);      // ~0-400Hz (depending on sample rate)
        const mid = this.getAverageFrequency(10, 100);     // Mids
        const high = this.getAverageFrequency(100, 500);   // Highs
        
        // Expose data to system/scene for other components to read
        // Mapping 0-255 to 0.0-1.0
        this.el.emit('audio-analysis', {
            bass: bass / 255,
            mid: mid / 255,
            high: high / 255,
            raw: this.dataArray
        });
        
        // Also store on system for direct access (optimization)
        if (!this.el.systems['audio-reactive']) {
            this.el.sceneEl.setAttribute('audio-reactive-system', '');
        }
    },
    
    getAverageFrequency: function(startIndex, count) {
        let sum = 0;
        const end = Math.min(startIndex + count, this.bufferLength);
        const actualCount = end - startIndex;
        
        if (actualCount === 0) return 0;
        
        for (let i = startIndex; i < end; i++) {
            sum += this.dataArray[i];
        }
        return sum / actualCount;
    }
});

/**
 * System to hold global audio state
 */
AFRAME.registerSystem('audio-reactive', {
    init: function() {
        this.data = {
            bass: 0,
            mid: 0,
            high: 0
        };
        
        this.el.addEventListener('audio-analysis', (evt) => {
            this.data = evt.detail;
        });
    },
    
    getAudioData: function() {
        return this.data;
    }
});
