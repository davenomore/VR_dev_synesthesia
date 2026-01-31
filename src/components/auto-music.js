/* global AFRAME */
import { MusicStore } from '../js/music-store.js';

/**
 * Auto Music Component
 * Automatically retrieves the user's selected track from IndexedDB
 * and plays it via the 'audio-analyzer' system.
 */
AFRAME.registerComponent('auto-music', {
    init: function () {
        const initMusic = async () => {
            this.system = this.el.sceneEl.systems['audio-analyzer'];
            this.loaded = false;

            // Wait for system to be ready
            if (!this.system) {
                console.warn('AutoMusic: Audio Analyzer system not found!');
                return;
            }

            // Load track
            try {
                console.log('AutoMusic: Checking store...');
                const file = await MusicStore.getTrack();

                if (file) {
                    console.log('AutoMusic: Found track', file.name);

                    // Load into system
                    await this.system.loadAudio(file);
                    this.loaded = true;
                    this.tryPlay();
                } else {
                    console.log('AutoMusic: No track selected in store.');
                }
            } catch (e) {
                console.error('AutoMusic: Error loading track', e);
            }
        };

        if (this.el.sceneEl.hasLoaded) {
            initMusic();
        } else {
            this.el.sceneEl.addEventListener('loaded', initMusic);
        }

        // Retry listeners
        this.el.sceneEl.addEventListener('enter-vr', () => {
            if (this.loaded) this.tryPlay();
        });
        document.body.addEventListener('click', () => {
            if (this.loaded) this.tryPlay();
        }, { once: true });

        // Also listen for a custom 'play-music' event if we add a UI button
        this.el.sceneEl.addEventListener('play-music', () => {
            if (this.loaded) this.tryPlay();
        });
    },

    tryPlay: function () {
        if (!this.system) return;

        console.log('AutoMusic: Attempting playback...');
        // If context is suspended, resume it
        if (this.system.audioContext && this.system.audioContext.state === 'suspended') {
            console.log('AutoMusic: Context suspended, resuming...');
            this.system.audioContext.resume().then(() => {
                console.log('AutoMusic: Context resumed, playing.');
                this.system.play();
            }).catch(e => console.error('AutoMusic: Resume failed', e));
        } else {
            console.log('AutoMusic: Playing.');
            this.system.play();
        }
    }
});
