/* global AFRAME, THREE */

import {
    heroVertexShader,
    heroFragmentShader,
    heroDepthFragmentShader,
    sphereVertexShader,
    sphereFragmentShader,
    floorVertexShader,
    floorFragmentShader
} from '../shaders/challenge-shaders.js';

const INSTANCES_COUNT = 3000;

// STRICT CONSTANTS FROM REFERENCE
const RADIUS_MAIN = 1.5;
const RADIUS_GLASS = 0.3;
const RADIUS_ORBIT = 1.9;

AFRAME.registerComponent('instanced-sphere', {
    schema: {
        // We keep schema for tweaking, but defaults match reference
        radius: { default: RADIUS_MAIN },
        orbitRadius: { default: RADIUS_ORBIT },
        glassRadius: { default: RADIUS_GLASS }
    },

    init: function () {
        this.loader = new THREE.TextureLoader();

        // Load Textures
        this.noiseTexture = this.loader.load('/bnoise.png');
        this.noiseTexture.wrapS = THREE.RepeatWrapping;
        this.noiseTexture.wrapT = THREE.RepeatWrapping;

        this.matcapTexture = this.loader.load('/glass.png');

        // Light Position (Reference: (-1, 0.8, 0.25).normalize() * 5)
        this.lightPosition = new THREE.Vector3(-1, 0.8, 0.25).normalize().multiplyScalar(5);

        // --- Render Target for Refraction ---
        const renderer = this.el.sceneEl.renderer;
        const dpr = renderer.getPixelRatio();
        // Initial size, will likely update/match screen
        this.sceneRT = new THREE.WebGLRenderTarget(1024, 1024, {
            depthBuffer: false,
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter
        });

        // Configs for Orbit (Reference values)
        this.orbitConfigs = [
            { speed: 1.0, phase: Math.PI / 1.1, plane: 'yz', dir: 1 },
            { speed: 0.75, phase: Math.PI / 3.4, plane: 'xz', dir: -1 },
            { speed: 0.5, phase: Math.PI / 2.2, plane: 'yz', dir: 1 },
            { speed: 1.2, phase: Math.PI / 1.7, plane: 'xy', dir: -1 },
        ];

        // --- Create Objects ---
        this.createInstancedGeometry();
        this.createRefractionSpheres();
        this.createFloor();

        this.tick = this.tick.bind(this);
    },

    createInstancedGeometry: function () {
        const baseGeometry = new THREE.CapsuleGeometry(1, 4, 4, 16);
        baseGeometry.computeBoundingBox();

        const geometry = new THREE.InstancedBufferGeometry();
        geometry.index = baseGeometry.index;
        geometry.attributes = baseGeometry.attributes;

        const positionsArray = new Float32Array(INSTANCES_COUNT * 3);
        const quaternionsArray = new Float32Array(INSTANCES_COUNT * 4);

        const sphereRadius = this.data.radius;
        const goldenAngle = Math.PI * (3 - Math.sqrt(5));
        const up = new THREE.Vector3(0, 1, 0);
        const tempPos = new THREE.Vector3();
        const tempQuat = new THREE.Quaternion();

        for (let i = 0, i3 = 0, i4 = 0; i < INSTANCES_COUNT; i++, i3 += 3, i4 += 4) {
            const y = 1 - (i / (INSTANCES_COUNT - 1)) * 2;
            const radius = Math.sqrt(1 - y * y);
            const theta = goldenAngle * i;

            const x = Math.cos(theta) * radius * sphereRadius;
            const z = Math.sin(theta) * radius * sphereRadius;
            const posY = y * sphereRadius;

            positionsArray[i3] = x;
            positionsArray[i3 + 1] = posY;
            positionsArray[i3 + 2] = z;

            tempPos.set(-x, -posY, -z).normalize();
            tempQuat.setFromUnitVectors(up, tempPos);

            quaternionsArray[i4] = tempQuat.x;
            quaternionsArray[i4 + 1] = tempQuat.y;
            quaternionsArray[i4 + 2] = tempQuat.z;
            quaternionsArray[i4 + 3] = tempQuat.w;
        }

        geometry.setAttribute("a_instancePos", new THREE.InstancedBufferAttribute(positionsArray, 3));
        geometry.setAttribute("a_instanceQuaternions", new THREE.InstancedBufferAttribute(quaternionsArray, 4));

        this.uniforms = {
            u_scale: { value: 0.06 }, // Reference default
            u_lightPosition: { value: this.lightPosition },
            u_noiseTexture: { value: this.noiseTexture },
            u_noiseTexelSize: { value: new THREE.Vector2(1 / 128, 1 / 128) },
            u_noiseCoordOffset: { value: new THREE.Vector2(0, 0) },
            u_color: { value: new THREE.Color("#FFFFFF") }, // Bright white to match screenshot
            u_sphere1Position: { value: new THREE.Vector3() },
            u_sphere2Position: { value: new THREE.Vector3() },
            u_sphere3Position: { value: new THREE.Vector3() },
            u_sphere4Position: { value: new THREE.Vector3() },
            u_time: { value: 0 } // Fix: Initialize u_time
        };

        const material = new THREE.ShaderMaterial({
            vertexShader: heroVertexShader,
            fragmentShader: heroFragmentShader,
            uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.lights, this.uniforms]),
            lights: true
        });

        const customDepthMaterial = new THREE.ShaderMaterial({
            vertexShader: heroVertexShader,
            fragmentShader: heroDepthFragmentShader,
            uniforms: this.uniforms,
            defines: { IS_DEPTH: true }
        });

        this.instancedMesh = new THREE.Mesh(geometry, material);
        this.instancedMesh.customDepthMaterial = customDepthMaterial;
        this.instancedMesh.castShadow = true;
        this.instancedMesh.receiveShadow = true;
        this.instancedMesh.renderOrder = 0;

        // --- REAL-TIME REFRACTION HOOK ---
        this.instancedMesh.onAfterRender = (renderer, scene, camera) => {
            // Only capture if we have a target
            if (!this.sceneRT) return;

            // Simple copy of current frame to our RT
            try {
                // We use copyFramebufferToTexture to grab whatever is currently in the framebuffer.
                // This includes the background environment + this instanced mesh.
                const gl = renderer.getContext();

                // Assuming default framebuffer (screen) or current standard buffer.
                // We read into our texture.
                // Note: We blindly assume the size matches or we copy top-left corner.
                renderer.copyFramebufferToTexture(new THREE.Vector2(0, 0), this.sceneRT.texture);

                // Update resolution uniform if screen size changes drastically?
                // For now static 1024 is safer than resizing RT constantly.
            } catch (e) {
                // Fail silently
            }
        };

        this.el.setObject3D('mesh', this.instancedMesh);
    },

    createRefractionSpheres: function () {
        const geometry = new THREE.SphereGeometry(this.data.glassRadius, 32, 32);

        // Exclude u_sceneTexture from merge to avoid clone error
        this.uniformsSphere = {
            u_lightPosition: { value: this.lightPosition },
            u_noiseTexture: { value: this.noiseTexture },
            // u_sceneTexture set manually below
            u_resolution: { value: new THREE.Vector2(1024, 1024) },
            u_matcap: { value: this.matcapTexture },
        };

        const material = new THREE.ShaderMaterial({
            vertexShader: sphereVertexShader,
            fragmentShader: sphereFragmentShader,
            uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.lights, this.uniformsSphere]),
            lights: true
        });

        // Manually assign the texture uniform to avoid UniformsUtils.merge trying to clone it
        material.uniforms.u_sceneTexture = { value: this.sceneRT.texture };

        this.spheres = [];
        for (let i = 0; i < 4; i++) {
            const mesh = new THREE.Mesh(geometry, material);
            mesh.renderOrder = 1; // Render AFTER instanced mesh
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.el.object3D.add(mesh);
            this.spheres.push(mesh);
        }
    },

    createFloor: function () {
        const geometry = new THREE.PlaneGeometry(8, 8);
        const material = new THREE.ShaderMaterial({
            vertexShader: floorVertexShader,
            fragmentShader: floorFragmentShader,
            uniforms: THREE.UniformsUtils.merge([
                THREE.UniformsLib.lights,
                {
                    u_noiseTexture: { value: this.noiseTexture },
                    u_noiseTexelSize: { value: new THREE.Vector2(1 / 128, 1 / 128) },
                    u_noiseCoordOffset: { value: new THREE.Vector2(0, 0) },
                }
            ]),
            lights: true,
            transparent: true
        });

        const floor = new THREE.Mesh(geometry, material);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(4, -3, -1.5);
        this.el.object3D.add(floor);
    },

    tick: function (time, delta) {
        if (!this.instancedMesh) return;

        const t = time / 1000;
        const dt = delta / 1000;

        // Global Rotation
        this.instancedMesh.rotation.y += dt * 0.1;

        // Access the ACTUAL uniforms on the material
        const uniforms = this.instancedMesh.material.uniforms;

        // Update Noise
        if (uniforms) {
            uniforms.u_noiseCoordOffset.value.set(Math.random(), Math.random());
            uniforms.u_time.value = t;
        }

        // --- HAND TRACKING SYSTEM ---
        const handSys = this.el.sceneEl.systems['hand-distance'];

        // Orbit & Interaction Logic
        const orbitR = this.data.orbitRadius;
        const orbitPosition = (t, config) => {
            const angle = config.dir * config.speed * t + config.phase;
            if (config.plane === 'xy') return [Math.cos(angle) * orbitR, Math.sin(angle) * orbitR, 0];
            if (config.plane === 'xz') return [Math.cos(angle) * orbitR, 0, Math.sin(angle) * orbitR];
            if (config.plane === 'yz') return [0, Math.cos(angle) * orbitR, Math.sin(angle) * orbitR];
            return [Math.cos(angle) * orbitR, Math.sin(angle) * orbitR, 0];
        };

        const updateSphere = (index, config) => {
            const sphere = this.spheres[index];
            const uniformKey = `u_sphere${index + 1}Position`;

            // Calculate natural orbit position
            const orbitPosArray = orbitPosition(t, config);
            const targetPos = new THREE.Vector3(...orbitPosArray);

            // Interaction Override?
            if (handSys && handSys.leftPos && handSys.rightPos) {
                if (index === 0 && handSys.leftHand) {
                    this.tempVec = this.tempVec || new THREE.Vector3();
                    this.tempVec.copy(handSys.leftPos);
                    this.el.object3D.worldToLocal(this.tempVec);
                    if (this.tempVec.length() < 3.0) {
                        targetPos.copy(this.tempVec);
                    }
                }
                if (index === 1 && handSys.rightHand) {
                    this.tempVec = this.tempVec || new THREE.Vector3();
                    this.tempVec.copy(handSys.rightPos);
                    this.el.object3D.worldToLocal(this.tempVec);
                    if (this.tempVec.length() < 3.0) {
                        targetPos.copy(this.tempVec);
                    }
                }
            }

            // Lerp to target
            sphere.position.lerp(targetPos, 0.1);

            // Update Uniform ON MATERIAL
            if (uniforms && uniforms[uniformKey]) {
                uniforms[uniformKey].value.copy(sphere.position);
            }
        };

        this.orbitConfigs.forEach((config, i) => updateSphere(i, config));
    }
});
