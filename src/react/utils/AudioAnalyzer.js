import { MusicStore } from '../../js/music-store.js';

export class AudioAnalyzer {
    constructor() {
        this.context = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.context.createAnalyser();
        this.analyser.fftSize = 1024;
        this.bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(this.bufferLength);
        this.isReady = false;

        // Source
        this.sourceNode = null;
        this.audioElement = null;

        // Bands
        this.bass = 0;
        this.mid = 0;
        this.high = 0;
    }

    async start() {
        if (this.context.state === 'suspended') {
            await this.context.resume();
        }

        console.log("AudioAnalyzer: Starting...");

        // 1. Try to load from MusicStore (IndexedDB)
        try {
            const file = await MusicStore.getTrack();
            if (file) {
                console.log("AudioAnalyzer: Found track in MusicStore:", file.name);
                this.playTrack(file);
                return;
            } else {
                console.log("AudioAnalyzer: No track in MusicStore. Please select one in the menu.");
                // Alerting user nicely that they need a track
                // alert("No music selected! Please go back to the menu and choose a track.");
            }
        } catch (e) {
            console.error("AudioAnalyzer: MusicStore check failed:", e);
        }

        // 2. NO Microphone Fallback (Requested by User)
        console.log("AudioAnalyzer: Microphone access disabled by configuration.");
    }

    playTrack(file) {
        // cleanup previous
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.src = '';
        }

        this.audioElement = new Audio(URL.createObjectURL(file));
        this.audioElement.loop = true;
        this.audioElement.volume = 1.0;

        // Important: MediaElementSource requires the audio to be playing
        this.audioElement.play().then(() => {
            console.log("AudioAnalyzer: Track playing.");
        }).catch(e => console.error("AudioAnalyzer: Play error:", e));

        this.sourceNode = this.context.createMediaElementSource(this.audioElement);
        this.sourceNode.connect(this.analyser);
        this.analyser.connect(this.context.destination); // Connect to speakers so we can hear it

        this.isReady = true;
    }

    update() {
        if (!this.isReady) return;

        this.analyser.getByteFrequencyData(this.dataArray);

        // Simple averaging for bands (fftSize 1024 -> 512 bins)
        // Sample Rate (usually 44100 or 48000) / fftSize * binIndex = Frequency
        // Bin size ~43Hz

        let bassSum = 0;
        let midSum = 0;
        let highSum = 0;

        const bassCount = 10; // ~0-430Hz
        const midCount = 100; // ~430-4700Hz

        for (let i = 0; i < this.bufferLength; i++) {
            const val = this.dataArray[i] / 255.0; // normalize 0-1
            if (i < bassCount) bassSum += val;
            else if (i < bassCount + midCount) midSum += val;
            else highSum += val;
        }

        this.bass = bassSum / bassCount;
        this.mid = midSum / midCount;
        this.high = highSum / (this.bufferLength - bassCount - midCount);
    }

    getBands() {
        return {
            bass: this.bass,
            mid: this.mid,
            high: this.high
        };
    }

    dispose() {
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.src = '';
        }
        if (this.context) {
            this.context.close();
        }
    }
}
