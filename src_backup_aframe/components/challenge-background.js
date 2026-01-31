/* global AFRAME, THREE */

AFRAME.registerComponent('challenge-background', {
    init: function () {
        const geometry = new THREE.SphereGeometry(100, 32, 32);

        // Colors from reference
        const u_color0 = new THREE.Color("#AEB2B5");
        const u_color1 = new THREE.Color("#939A9D");

        const material = new THREE.ShaderMaterial({
            vertexShader: `
                varying vec2 v_uv;
                void main() {
                    v_uv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                varying vec2 v_uv;
                uniform vec3 u_color0;
                uniform vec3 u_color1;

                void main() {
                    // Reference was mix(c0, c1, v_uv.x) - horizontal gradient
                    // We render on inside of sphere, so x goes 0->1 around us
                    gl_FragColor = vec4(mix(u_color0, u_color1, v_uv.x), 1.0);
                }
            `,
            uniforms: {
                u_color0: { value: u_color0 },
                u_color1: { value: u_color1 }
            },
            side: THREE.BackSide,
            depthWrite: false
        });

        const mesh = new THREE.Mesh(geometry, material);
        this.el.setObject3D('mesh', mesh);
    }
});
