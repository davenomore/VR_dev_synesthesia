/* global AFRAME */

/**
 * Audio UI Component
 * File upload + URL input + Demo tracks for audio selection
 */
AFRAME.registerComponent('audio-ui', {
    schema: {
        position: { type: 'vec3', default: { x: 0, y: 1.5, z: -1.5 } }
    },

    // Demo tracks (local files - no CORS issues)
    // Add your own MP3s to /public/audio/ folder
    demoTracks: [
        { name: '🎵 Electronic', url: '/audio/demo-electronic.mp3' },
        { name: '❤️ Hegyszíve', url: '/audio/hegyszive.mp3' }
    ],

    init: function () {
        this.audioAnalyzer = null;
        this.isPlaying = false;

        // Create HTML UI
        this.createUI();

        // Get analyzer reference
        this.el.sceneEl.addEventListener('loaded', () => {
            this.audioAnalyzer = this.el.sceneEl.systems['audio-analyzer'];
        });
    },

    createUI: function () {
        // Create overlay container
        const container = document.createElement('div');
        container.id = 'audio-ui';
        container.innerHTML = `
            <style>
                #audio-ui {
                    position: fixed;
                    bottom: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: 9999;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    align-items: center;
                    background: rgba(0, 0, 0, 0.9);
                    padding: 20px 30px;
                    border-radius: 20px;
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    max-width: 90vw;
                }
                
                #audio-ui.hidden {
                    display: none;
                }
                
                #audio-ui .row {
                    display: flex;
                    gap: 10px;
                    align-items: center;
                    flex-wrap: wrap;
                    justify-content: center;
                }
                
                #audio-ui button {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border: none;
                    color: white;
                    padding: 12px 20px;
                    border-radius: 25px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 600;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    white-space: nowrap;
                }
                
                #audio-ui button:hover {
                    transform: scale(1.05);
                    box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
                }
                
                #audio-ui button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                    transform: none;
                }
                
                #audio-ui button.demo-btn {
                    background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
                    padding: 10px 16px;
                    font-size: 13px;
                }
                
                #audio-ui input[type="file"] {
                    display: none;
                }
                
                #audio-ui .file-label {
                    background: rgba(255, 255, 255, 0.1);
                    border: 2px dashed rgba(255, 255, 255, 0.3);
                    color: white;
                    padding: 12px 20px;
                    border-radius: 25px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.3s ease;
                }
                
                #audio-ui .file-label:hover {
                    border-color: #667eea;
                    background: rgba(102, 126, 234, 0.2);
                }
                
                #audio-ui .url-input {
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    color: white;
                    padding: 10px 15px;
                    border-radius: 20px;
                    font-size: 13px;
                    width: 200px;
                    outline: none;
                }
                
                #audio-ui .url-input::placeholder {
                    color: rgba(255, 255, 255, 0.5);
                }
                
                #audio-ui .url-input:focus {
                    border-color: #667eea;
                }
                
                #audio-ui .status {
                    color: rgba(255, 255, 255, 0.7);
                    font-size: 12px;
                    text-align: center;
                }
                
                #audio-ui .visualizer {
                    display: flex;
                    gap: 3px;
                    align-items: flex-end;
                    height: 30px;
                }
                
                #audio-ui .visualizer .bar {
                    width: 4px;
                    background: linear-gradient(to top, #00ff88, #667eea);
                    border-radius: 2px;
                    transition: height 0.1s ease;
                }
                
                #audio-ui .section-label {
                    color: rgba(255, 255, 255, 0.5);
                    font-size: 11px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    margin-top: 5px;
                }
            </style>
            
            <!-- Demo Tracks Section -->
            <span class="section-label">Quick Start - Demo Tracks</span>
            <div class="row" id="demo-row">
                <!-- Demo buttons will be added here -->
            </div>
            
            <!-- Divider -->
            <span class="section-label">Or Use Your Own</span>
            
            <!-- File & URL Row -->
            <div class="row">
                <label class="file-label" for="audio-file-input">
                    📁 File
                </label>
                <input type="file" id="audio-file-input" accept="audio/*">
                
                <input type="text" class="url-input" id="audio-url-input" placeholder="Paste audio URL...">
                <button id="load-url-btn">Load URL</button>
            </div>
            
            <!-- Playback Row -->
            <div class="row">
                <button id="play-btn" disabled>
                    <span class="icon">▶</span>
                    <span class="text">Play</span>
                </button>
                
                <div class="visualizer" id="mini-visualizer">
                    <div class="bar" style="height: 5px;"></div>
                    <div class="bar" style="height: 10px;"></div>
                    <div class="bar" style="height: 15px;"></div>
                    <div class="bar" style="height: 10px;"></div>
                    <div class="bar" style="height: 5px;"></div>
                </div>
            </div>
            
            <span class="status" id="audio-status">Select a demo track or load your own audio</span>
        `;

        document.body.appendChild(container);

        // Add demo track buttons
        const demoRow = container.querySelector('#demo-row');
        this.demoTracks.forEach((track, index) => {
            const btn = document.createElement('button');
            btn.className = 'demo-btn';
            btn.textContent = track.name;
            btn.addEventListener('click', () => this.loadFromUrl(track.url, track.name));
            demoRow.appendChild(btn);
        });

        // Event handlers
        const fileInput = container.querySelector('#audio-file-input');
        const urlInput = container.querySelector('#audio-url-input');
        const loadUrlBtn = container.querySelector('#load-url-btn');
        const playBtn = container.querySelector('#play-btn');
        const status = container.querySelector('#audio-status');
        const fileLabel = container.querySelector('.file-label');
        const visualizer = container.querySelector('#mini-visualizer');
        const bars = visualizer.querySelectorAll('.bar');

        // File input handler
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file && this.audioAnalyzer) {
                status.textContent = 'Loading file...';
                try {
                    await this.audioAnalyzer.loadAudio(file);
                    status.textContent = '✅ ' + file.name.substring(0, 25);
                    fileLabel.textContent = '📁 ' + file.name.substring(0, 12);
                    playBtn.disabled = false;
                } catch (err) {
                    status.textContent = '❌ Error loading file';
                    console.error(err);
                }
            }
        });

        // URL load handler
        loadUrlBtn.addEventListener('click', () => {
            const url = urlInput.value.trim();
            if (url) {
                this.loadFromUrl(url, 'URL Audio');
            }
        });

        // Enter key on URL input
        urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                loadUrlBtn.click();
            }
        });

        // Play button
        playBtn.addEventListener('click', () => {
            if (!this.audioAnalyzer) return;

            this.audioAnalyzer.toggle();
            this.isPlaying = !this.isPlaying;

            playBtn.querySelector('.icon').textContent = this.isPlaying ? '⏸' : '▶';
            playBtn.querySelector('.text').textContent = this.isPlaying ? 'Pause' : 'Play';
        });

        // Store references
        this.playBtn = playBtn;
        this.status = status;
        this.visualizerBars = bars;
        this.container = container;

        // Hide UI in VR
        this.el.sceneEl.addEventListener('enter-vr', () => {
            container.classList.add('hidden');
        });
        this.el.sceneEl.addEventListener('exit-vr', () => {
            container.classList.remove('hidden');
        });
    },

    loadFromUrl: async function (url, name) {
        if (!this.audioAnalyzer) return;

        this.status.textContent = 'Loading from URL...';
        try {
            await this.audioAnalyzer.loadAudio(url);
            this.status.textContent = '✅ ' + name;
            this.playBtn.disabled = false;
        } catch (err) {
            this.status.textContent = '❌ Failed to load URL (CORS?)';
            console.error('URL load error:', err);
        }
    },

    tick: function () {
        if (!this.audioAnalyzer || !this.isPlaying || !this.visualizerBars) return;

        const bands = this.audioAnalyzer.getBands();
        const heights = [
            5 + bands.bass * 25,
            8 + (bands.bass + bands.mid) * 15,
            10 + bands.mid * 20,
            8 + (bands.mid + bands.high) * 15,
            5 + bands.high * 25
        ];

        this.visualizerBars.forEach((bar, i) => {
            bar.style.height = heights[i] + 'px';
        });
    },

    remove: function () {
        if (this.container) {
            this.container.remove();
        }
    }
});
