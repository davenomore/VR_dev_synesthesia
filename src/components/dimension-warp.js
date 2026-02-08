/* global AFRAME, THREE */

/**
 * Dimension Warp - Hyperspace Edition
 * 
 * A hyperspace warp tunnel effect inspired by sci-fi jump-to-lightspeed visuals.
 * Features:
 * - Star particles flying outward from center
 * - Radial light rays with motion blur
 * - Central volumetric glow
 * - Audio-reactive speed and intensity
 */
AFRAME.registerComponent('dimension-warp', {
    schema: {
        starCount: { type: 'number', default: 2500 },
        rayCount: { type: 'number', default: 80 },
        speed: { type: 'number', default: 50 }
    },

    init: function () {
        this.audioSystem = this.el.sceneEl.systems['audio-analyzer'];
        this.handSystem = this.el.sceneEl.systems['hand-distance'];

        // Wrapper group for all warp elements (rotatable)
        this.warpGroup = new THREE.Group();
        this.el.setObject3D('warp-group', this.warpGroup);

        // Target direction for smooth rotation
        this.targetDirection = new THREE.Vector3(0, 0, -1);
        this.currentQuaternion = new THREE.Quaternion();
        this.targetQuaternion = new THREE.Quaternion();

        // Steering offset for curved warp effect (like spaceship steering)
        this.steeringOffset = new THREE.Vector2(0, 0);
        this.targetSteering = new THREE.Vector2(0, 0);

        // Time slowdown (1.0 = normal, 0.05 = nearly frozen)
        this.slowdownFactor = 1.0;
        this.targetSlowdown = 1.0;

        // Boost factor for pinch (1.0 = normal, 3.0 = hyperspace boost)
        this.boostFactor = 1.0;
        this.targetBoost = 1.0;

        // Create all visual elements
        this.createStarField();
        this.createLightRays();
        this.createCentralGlow();

        this.tick = this.tick.bind(this);

        // Listen for gestures
        this.el.sceneEl.addEventListener('loaded', () => {
            const leftHand = document.querySelector('#leftHand');
            const rightHand = document.querySelector('#rightHand');

            if (leftHand) {
                leftHand.addEventListener('gesture-fist', () => { this.targetSlowdown = 0.05; });
                leftHand.addEventListener('gesture-fist-end', () => { this.targetSlowdown = 1.0; });
                // Left pinch = Boost
                leftHand.addEventListener('pinchstarted', () => { this.targetBoost = 3.0; });
                leftHand.addEventListener('pinchended', () => { this.targetBoost = 1.0; });
            }
            if (rightHand) {
                rightHand.addEventListener('gesture-fist', () => { this.targetSlowdown = 0.05; });
                rightHand.addEventListener('gesture-fist-end', () => { this.targetSlowdown = 1.0; });
                // Right pinch = Boost
                rightHand.addEventListener('pinchstarted', () => { this.targetBoost = 3.0; });
                rightHand.addEventListener('pinchended', () => { this.targetBoost = 1.0; });
            }
        });
    },

    /**
     * Star Particle System - Points flying from center outward
     */
    createStarField: function () {
        const count = this.data.starCount;

        // Geometry with positions
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const speeds = new Float32Array(count);
        const colors = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            // Spawn stars in a cylindrical distribution around the forward axis
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 40 + 3; // 3-43 units from center
            const z = Math.random() * 350 - 250; // -250 to +100 depth

            positions[i * 3] = Math.cos(angle) * radius;
            positions[i * 3 + 1] = Math.sin(angle) * radius;
            positions[i * 3 + 2] = z;

            // Varying sizes for depth illusion
            sizes[i] = Math.random() * 3 + 1;

            // Speed variation
            speeds[i] = Math.random() * 0.5 + 0.75;

            // Color: mostly cyan-white with some variation
            const brightness = Math.random() * 0.3 + 0.7;
            colors[i * 3] = brightness * 0.6;     // R - slight cyan tint
            colors[i * 3 + 1] = brightness * 0.9; // G
            colors[i * 3 + 2] = brightness;       // B - full blue
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('speed', new THREE.BufferAttribute(speeds, 1));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        // Custom shader for glowing stars with size attenuation
        const material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uIntensity: { value: 1.0 }
            },
            vertexShader: `
                attribute float size;
                attribute float speed;
                attribute vec3 color;
                
                varying vec3 vColor;
                varying float vAlpha;
                
                void main() {
                    vColor = color;
                    
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    
                    // Size attenuation based on distance
                    float dist = -mvPosition.z;
                    gl_PointSize = size * (150.0 / dist);
                    
                    // Fade out stars that are too close or far
                    vAlpha = smoothstep(5.0, 20.0, dist) * smoothstep(200.0, 100.0, dist);
                    
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform float uIntensity;
                
                varying vec3 vColor;
                varying float vAlpha;
                
                void main() {
                    // Soft circular glow
                    vec2 center = gl_PointCoord - vec2(0.5);
                    float dist = length(center);
                    
                    // Soft falloff for glow effect
                    float alpha = smoothstep(0.5, 0.0, dist);
                    alpha *= alpha; // Sharper core
                    
                    // Bright core with glow
                    vec3 glowColor = vColor * uIntensity * (1.0 + alpha * 2.0);
                    
                    gl_FragColor = vec4(glowColor, alpha * vAlpha);
                }
            `,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            transparent: true
        });

        this.stars = new THREE.Points(geometry, material);
        this.starPositions = positions;
        this.starSpeeds = speeds;
        this.starSizes = sizes;

        this.warpGroup.add(this.stars);
    },

    /**
     * Light Rays - Smooth cylinder beams for better VR quality
     */
    createLightRays: function () {
        const count = this.data.rayCount;
        const rayGroup = new THREE.Group();

        this.rays = [];

        for (let i = 0; i < count; i++) {
            // Random angle around the center
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 25 + 5;

            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            const zStart = Math.random() * 250 - 200;
            const length = Math.random() * 20 + 10;
            const thickness = Math.random() * 0.08 + 0.03; // Thin cylinders

            // Cylinder geometry (aligned along Z axis)
            const geometry = new THREE.CylinderGeometry(thickness, thickness, length, 4, 1);
            geometry.rotateX(Math.PI / 2); // Align to Z axis

            // Varying brightness and color
            const brightness = Math.random() * 0.5 + 0.5;
            const color = new THREE.Color().setHSL(0.55 + Math.random() * 0.1, 0.8, brightness);

            const material = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: brightness * 0.5,
                blending: THREE.AdditiveBlending
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(x, y, zStart + length / 2);

            this.rays.push({
                mesh: mesh,
                speed: Math.random() * 0.5 + 0.75,
                startX: x,
                startY: y,
                zStart: zStart,
                length: length,
                baseOpacity: brightness * 0.5
            });

            rayGroup.add(mesh);
        }

        this.rayGroup = rayGroup;
        this.warpGroup.add(this.rayGroup);
    },

    /**
     * Central Glow - Volumetric light effect at the vanishing point
     */
    createCentralGlow: function () {
        // Use CircleGeometry with many segments for smooth edge
        const geometry = new THREE.CircleGeometry(40, 64);

        const material = new THREE.ShaderMaterial({
            uniforms: {
                uIntensity: { value: 0.25 },
                uColor: { value: new THREE.Color(0x0088ff) }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float uIntensity;
                uniform vec3 uColor;
                varying vec2 vUv;
                
                void main() {
                    vec2 center = vUv - vec2(0.5);
                    float dist = length(center) * 2.0; // Normalize to 0-1 range
                    
                    // Smooth radial gradient that fades completely at edges
                    float glow = 1.0 - smoothstep(0.0, 1.0, dist);
                    glow = pow(glow, 2.0) * uIntensity;
                    
                    // Subtle radial streaks for added visual interest
                    float angle = atan(center.y, center.x);
                    float streaks = sin(angle * 16.0) * 0.5 + 0.5;
                    streaks = pow(streaks, 8.0) * 0.15 * glow;
                    
                    float alpha = glow + streaks;
                    
                    // Boost core brightness (reduced to prevent burn-out)
                    vec3 finalColor = mix(uColor, vec3(0.9, 0.95, 1.0), glow * 0.3);
                    
                    gl_FragColor = vec4(finalColor * (0.8 + glow * 0.5), alpha);
                }
            `,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            transparent: true,
            side: THREE.DoubleSide
        });

        this.centralGlow = new THREE.Mesh(geometry, material);
        this.centralGlow.position.z = -180; // Far in the distance

        this.warpGroup.add(this.centralGlow);
    },

    tick: function (time, timeDelta) {
        if (!this.stars) return;

        // Smooth slowdown interpolation
        this.slowdownFactor += (this.targetSlowdown - this.slowdownFactor) * 0.1;

        // Smooth boost interpolation
        this.boostFactor += (this.targetBoost - this.boostFactor) * 0.15;

        const deltaSeconds = (timeDelta / 1000) * this.slowdownFactor * this.boostFactor;

        // Audio reactivity (enhanced multipliers)
        let bass = 0, mid = 0, high = 0;
        if (this.audioSystem && this.audioSystem.isPlaying) {
            const bands = this.audioSystem.getBands();
            if (bands) {
                // Stronger audio response
                bass = bands.bass * 2.0;  // Double bass impact
                mid = bands.mid * 1.5;
                high = bands.high * 1.5;
            }
        } else {
            // Fallback animation when no audio
            const t = time * 0.001;
            bass = (Math.sin(t * 2) * 0.5 + 0.5) * 0.5;
            mid = (Math.sin(t * 3 + 1) * 0.5 + 0.5) * 0.3;
            high = (Math.sin(t * 5 + 2) * 0.5 + 0.5) * 0.2;
        }

        // Speed calculation (enhanced audio + boost)
        const baseSpeed = this.data.speed;
        const audioBoost = bass * 200;  // Stronger bass response
        const warpSpeed = (baseSpeed + audioBoost) * this.boostFactor;
        const traverse = warpSpeed * deltaSeconds / this.boostFactor; // normalize for deltaSeconds already having boost

        // ===== UPDATE STARS =====
        const positions = this.stars.geometry.attributes.position.array;
        const starCount = this.data.starCount;

        for (let i = 0; i < starCount; i++) {
            const idx = i * 3;

            // Normal Z movement (forward through warp)
            positions[idx + 2] += traverse * this.starSpeeds[i];

            // Reset when passed camera
            if (positions[idx + 2] > 50) {
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.random() * 40 + 3;
                positions[idx] = Math.cos(angle) * radius;
                positions[idx + 1] = Math.sin(angle) * radius;
                positions[idx + 2] = -250 + Math.random() * 50;
            }
        }
        this.stars.geometry.attributes.position.needsUpdate = true;

        // Update star intensity (enhanced audio + boost)
        const starIntensity = 0.8 + bass * 1.5 + high * 0.8 + (this.boostFactor - 1.0) * 0.5;
        this.stars.material.uniforms.uIntensity.value = starIntensity;

        // ===== UPDATE RAYS (cylinder meshes) =====
        for (let i = 0; i < this.rays.length; i++) {
            const ray = this.rays[i];

            // Move forward
            ray.mesh.position.z += traverse * ray.speed;

            // Reset when passed camera
            if (ray.mesh.position.z > 50) {
                ray.mesh.position.x = ray.startX;
                ray.mesh.position.y = ray.startY;
                ray.mesh.position.z = ray.zStart + ray.length / 2;
            }

            // Pulse opacity with mid frequencies
            ray.mesh.material.opacity = ray.baseOpacity * (1.0 + mid * 3.0 + this.boostFactor * 0.3);
        }

        // ===== UPDATE CENTRAL GLOW =====
        // Softer glow during boost to prevent burnout
        const boostDim = 1.0 / (1.0 + (this.boostFactor - 1.0) * 0.3); // Dims as boost increases
        const glowIntensity = (0.2 + bass * 0.4) * boostDim;
        this.centralGlow.material.uniforms.uIntensity.value = glowIntensity;

        // Faster rotation during boost
        this.centralGlow.rotation.z += deltaSeconds * (0.1 + this.boostFactor * 0.2);
    },

    remove: function () {
        this.el.removeObject3D('warp-group');
    }
});
