/* global AFRAME, THREE */

/**
 * VR Menu Component for Synesthetic Pulse
 * Floating panel that follows the user's gaze
 * Toggle with left hand pinch
 */
AFRAME.registerComponent('vr-menu', {
    schema: {
        distance: { default: 1.5 },
        width: { default: 0.8 },
        height: { default: 0.5 }
    },

    init: function () {
        this.isVisible = false;
        this.camera = null;
        this.audioAnalyzer = null;

        // Create menu panel
        this.createMenu();

        // Get camera reference
        this.el.sceneEl.addEventListener('loaded', () => {
            this.camera = this.el.sceneEl.querySelector('[camera]');
            this.audioAnalyzer = this.el.sceneEl.systems['audio-analyzer'];
        });

        // Listen for VR mode
        this.el.sceneEl.addEventListener('enter-vr', () => {
            console.log('[VR Menu] VR mode entered - pinch left hand to open menu');
        });
    },

    createMenu: function () {
        const menu = document.createElement('a-entity');
        menu.id = 'vr-menu-panel';
        menu.setAttribute('visible', false);

        // Background panel
        const bg = document.createElement('a-plane');
        bg.setAttribute('width', this.data.width);
        bg.setAttribute('height', this.data.height);
        bg.setAttribute('material', {
            color: '#000000',
            opacity: 0.85,
            transparent: true,
            shader: 'flat'
        });
        bg.setAttribute('position', '0 0 0');
        menu.appendChild(bg);

        // Border glow
        const border = document.createElement('a-plane');
        border.setAttribute('width', this.data.width + 0.02);
        border.setAttribute('height', this.data.height + 0.02);
        border.setAttribute('material', {
            color: '#667eea',
            opacity: 0.5,
            transparent: true,
            shader: 'flat'
        });
        border.setAttribute('position', '0 0 -0.001');
        menu.appendChild(border);

        // Title
        const title = document.createElement('a-text');
        title.setAttribute('value', 'SYNESTHETIC PULSE');
        title.setAttribute('align', 'center');
        title.setAttribute('color', '#00ffaa');
        title.setAttribute('width', 1.5);
        title.setAttribute('position', '0 0.18 0.01');
        menu.appendChild(title);

        // Play/Pause button
        this.playBtn = document.createElement('a-entity');
        this.playBtn.setAttribute('geometry', { primitive: 'plane', width: 0.25, height: 0.08 });
        this.playBtn.setAttribute('material', { color: '#667eea', shader: 'flat' });
        this.playBtn.setAttribute('position', '-0.15 0.05 0.01');
        this.playBtn.setAttribute('class', 'clickable');

        const playText = document.createElement('a-text');
        playText.setAttribute('value', '▶ PLAY');
        playText.setAttribute('align', 'center');
        playText.setAttribute('color', '#ffffff');
        playText.setAttribute('width', 1.2);
        playText.setAttribute('position', '0 0 0.01');
        playText.id = 'play-text';
        this.playBtn.appendChild(playText);
        this.playBtn.addEventListener('click', () => this.togglePlay());
        menu.appendChild(this.playBtn);

        // Exit VR button
        const exitBtn = document.createElement('a-entity');
        exitBtn.setAttribute('geometry', { primitive: 'plane', width: 0.25, height: 0.08 });
        exitBtn.setAttribute('material', { color: '#aa3366', shader: 'flat' });
        exitBtn.setAttribute('position', '0.15 0.05 0.01');
        exitBtn.setAttribute('class', 'clickable');

        const exitText = document.createElement('a-text');
        exitText.setAttribute('value', '✕ EXIT VR');
        exitText.setAttribute('align', 'center');
        exitText.setAttribute('color', '#ffffff');
        exitText.setAttribute('width', 1.2);
        exitText.setAttribute('position', '0 0 0.01');
        exitBtn.appendChild(exitText);
        exitBtn.addEventListener('click', () => {
            this.el.sceneEl.exitVR();
        });
        menu.appendChild(exitBtn);

        // Particle count slider label
        const particleLabel = document.createElement('a-text');
        particleLabel.setAttribute('value', 'Particles: 50K');
        particleLabel.setAttribute('align', 'center');
        particleLabel.setAttribute('color', '#ffffff');
        particleLabel.setAttribute('width', 1);
        particleLabel.setAttribute('position', '0 -0.08 0.01');
        particleLabel.id = 'particle-label';
        menu.appendChild(particleLabel);

        // Less/More buttons
        const lessBtn = document.createElement('a-entity');
        lessBtn.setAttribute('geometry', { primitive: 'plane', width: 0.1, height: 0.06 });
        lessBtn.setAttribute('material', { color: '#444', shader: 'flat' });
        lessBtn.setAttribute('position', '-0.2 -0.16 0.01');
        lessBtn.setAttribute('class', 'clickable');
        const lessText = document.createElement('a-text');
        lessText.setAttribute('value', '−');
        lessText.setAttribute('align', 'center');
        lessText.setAttribute('color', '#ffffff');
        lessText.setAttribute('width', 2);
        lessText.setAttribute('position', '0 0 0.01');
        lessBtn.appendChild(lessText);
        lessBtn.addEventListener('click', () => this.adjustParticles(-10000));
        menu.appendChild(lessBtn);

        const moreBtn = document.createElement('a-entity');
        moreBtn.setAttribute('geometry', { primitive: 'plane', width: 0.1, height: 0.06 });
        moreBtn.setAttribute('material', { color: '#444', shader: 'flat' });
        moreBtn.setAttribute('position', '0.2 -0.16 0.01');
        moreBtn.setAttribute('class', 'clickable');
        const moreText = document.createElement('a-text');
        moreText.setAttribute('value', '+');
        moreText.setAttribute('align', 'center');
        moreText.setAttribute('color', '#ffffff');
        moreText.setAttribute('width', 2);
        moreText.setAttribute('position', '0 0 0.01');
        moreBtn.appendChild(moreText);
        moreBtn.addEventListener('click', () => this.adjustParticles(10000));
        menu.appendChild(moreBtn);

        // Add cursor/raycaster for clicking
        menu.setAttribute('raycaster', {
            objects: '.clickable',
            far: 3
        });

        this.menuPanel = menu;
        this.el.sceneEl.appendChild(menu);
    },

    togglePlay: function () {
        if (!this.audioAnalyzer) return;

        this.audioAnalyzer.toggle();
        const isPlaying = this.audioAnalyzer.isPlaying;

        const playText = this.playBtn.querySelector('#play-text');
        if (playText) {
            playText.setAttribute('value', isPlaying ? '⏸ PAUSE' : '▶ PLAY');
        }
        this.playBtn.setAttribute('material', 'color', isPlaying ? '#44aa44' : '#667eea');
    },

    adjustParticles: function (delta) {
        const particleEl = this.el.sceneEl.querySelector('[synesthetic-particles]');
        if (!particleEl) return;

        const particles = particleEl.components['synesthetic-particles'];
        if (!particles) return;

        // Can't dynamically change count easily, but update label
        const label = this.menuPanel.querySelector('#particle-label');
        const currentText = label.getAttribute('value');
        const match = currentText.match(/(\d+)K/);
        if (match) {
            let count = parseInt(match[1]) * 1000 + delta;
            count = Math.max(10000, Math.min(200000, count));
            label.setAttribute('value', `Particles: ${count / 1000}K`);
        }
    },

    show: function () {
        if (!this.camera || !this.menuPanel) return;

        // Position menu in front of camera
        const cameraPos = new THREE.Vector3();
        const cameraDir = new THREE.Vector3();

        this.camera.object3D.getWorldPosition(cameraPos);
        this.camera.object3D.getWorldDirection(cameraDir);

        const menuPos = cameraPos.clone().add(cameraDir.multiplyScalar(this.data.distance));
        menuPos.y = cameraPos.y; // Keep at eye level

        this.menuPanel.object3D.position.copy(menuPos);
        this.menuPanel.object3D.lookAt(cameraPos);

        this.menuPanel.setAttribute('visible', true);
        this.isVisible = true;
    },

    hide: function () {
        if (this.menuPanel) {
            this.menuPanel.setAttribute('visible', false);
            this.isVisible = false;
        }
    },

    toggle: function () {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
});

/**
 * VR Menu Toggle - Attach to left hand
 * Double-pinch to toggle menu
 */
AFRAME.registerComponent('vr-menu-toggle', {
    schema: {
        menuComponent: { type: 'string', default: 'vr-menu' }
    },

    init: function () {
        this.lastPinchTime = 0;
        this.vrMenu = null;

        this.el.sceneEl.addEventListener('loaded', () => {
            // Find the vr-menu component
            const menuEl = this.el.sceneEl.querySelector('[vr-menu]');
            if (menuEl) {
                this.vrMenu = menuEl.components['vr-menu'];
            }
        });

        // Double-pinch to toggle (two pinches within 500ms)
        this.el.addEventListener('pinchstarted', () => {
            const now = performance.now();
            if (now - this.lastPinchTime < 500) {
                // Double pinch detected!
                if (this.vrMenu) {
                    this.vrMenu.toggle();
                    console.log('[VR Menu] Toggled via double-pinch');
                }
                this.lastPinchTime = 0; // Reset
            } else {
                this.lastPinchTime = now;
            }
        });
    }
});
