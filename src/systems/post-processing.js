/* global AFRAME, THREE */

/**
 * Post Processing System
 * Bloom + Chromatic Aberration for Synesthetic Pulse
 * Optimized for Quest 3 VR
 */
AFRAME.registerSystem('post-processing', {
    schema: {
        enabled: { default: true },
        bloomThreshold: { default: 0.8 },
        bloomStrength: { default: 1.5 },
        bloomRadius: { default: 0.4 },
        chromaticAberration: { default: 0.003 }
    },

    init: function () {
        this.renderer = this.el.renderer;
        this.scene = this.el.object3D;
        this.camera = null;
        this.composer = null;
        this.isVR = false;

        // Wait for scene to be ready
        this.el.addEventListener('loaded', () => {
            this.setupPostProcessing();
        });

        // Track VR state
        this.el.addEventListener('enter-vr', () => {
            this.isVR = true;
            // Disable complex post-processing in VR for performance
            if (this.composer) {
                this.data.enabled = false;
            }
        });

        this.el.addEventListener('exit-vr', () => {
            this.isVR = false;
            this.data.enabled = true;
        });

        console.log('[PostProcessing] System initialized');
    },

    setupPostProcessing: function () {
        // Get camera
        const cameraEl = this.el.querySelector('[camera]');
        if (!cameraEl) {
            console.warn('[PostProcessing] No camera found');
            return;
        }
        this.camera = cameraEl.getObject3D('camera');

        // Import Three.js post-processing (will be available via CDN or imports)
        if (!THREE.EffectComposer) {
            console.warn('[PostProcessing] THREE.EffectComposer not available. Add postprocessing library.');
            this.createFallbackEffect();
            return;
        }

        // Create composer
        this.composer = new THREE.EffectComposer(this.renderer);

        // Render pass
        const renderPass = new THREE.RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        // Bloom pass
        const bloomPass = new THREE.UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            this.data.bloomStrength,
            this.data.bloomRadius,
            this.data.bloomThreshold
        );
        this.composer.addPass(bloomPass);
        this.bloomPass = bloomPass;

        // Custom chromatic aberration shader
        const chromaticShader = {
            uniforms: {
                tDiffuse: { value: null },
                amount: { value: this.data.chromaticAberration }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float amount;
                varying vec2 vUv;
                
                void main() {
                    vec2 center = vec2(0.5);
                    vec2 dir = vUv - center;
                    float dist = length(dir);
                    
                    // Radial falloff - stronger at edges
                    float falloff = smoothstep(0.0, 0.7, dist);
                    float aberration = amount * falloff;
                    
                    vec2 rOffset = dir * aberration;
                    vec2 bOffset = -dir * aberration;
                    
                    float r = texture2D(tDiffuse, vUv + rOffset).r;
                    float g = texture2D(tDiffuse, vUv).g;
                    float b = texture2D(tDiffuse, vUv + bOffset).b;
                    
                    gl_FragColor = vec4(r, g, b, 1.0);
                }
            `
        };

        const chromaticPass = new THREE.ShaderPass(chromaticShader);
        this.composer.addPass(chromaticPass);
        this.chromaticPass = chromaticPass;

        console.log('[PostProcessing] Effects configured');
    },

    createFallbackEffect: function () {
        // Simple fallback: just add some ambient glow via scene background
        console.log('[PostProcessing] Using fallback (no composer)');
    },

    tick: function (time, delta) {
        if (!this.data.enabled || !this.composer || this.isVR) return;

        // Update bloom based on audio
        const audioAnalyzer = this.el.systems['audio-analyzer'];
        if (audioAnalyzer && this.bloomPass) {
            const bands = audioAnalyzer.getBands();
            // Increase bloom on high frequencies
            this.bloomPass.strength = this.data.bloomStrength + bands.high * 1.5;
        }

        // Render via composer
        this.composer.render(delta / 1000);
    }
});

/**
 * Simple bloom component for individual entities
 * (Fallback if EffectComposer unavailable)
 */
AFRAME.registerComponent('glow', {
    schema: {
        color: { type: 'color', default: '#ffffff' },
        intensity: { default: 1 }
    },

    init: function () {
        // Add emissive property to material
        this.el.addEventListener('loaded', () => {
            const mesh = this.el.getObject3D('mesh');
            if (mesh && mesh.material) {
                mesh.material.emissive = new THREE.Color(this.data.color);
                mesh.material.emissiveIntensity = this.data.intensity;
            }
        });
    },

    update: function () {
        const mesh = this.el.getObject3D('mesh');
        if (mesh && mesh.material) {
            mesh.material.emissive = new THREE.Color(this.data.color);
            mesh.material.emissiveIntensity = this.data.intensity;
        }
    }
});
