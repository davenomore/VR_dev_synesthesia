/* global AFRAME */

/**
 * Spell Caster Component - Wand Edition
 * Adds a physical Wand model to the hand and casts spells from its tip.
 */
AFRAME.registerComponent('spell-caster', {
    schema: {
        hand: { type: 'string', default: 'right' },
        wandLength: { type: 'number', default: 0.3 },
        wandColor: { type: 'color', default: '#5c4033' } // Dark wood
    },

    init: function () {
        this.activeSpell = 'wingardium_leviosa';
        this.targetEl = null;

        // Components
        this.el.setAttribute('force-grab', '');
        this.forceGrab = this.el.components['force-grab'];

        // 1. Create the Wand Visuals
        this.wandContainer = document.createElement('a-entity');

        // Position: In the palm/fingers. 
        // For 'hand-tracking-controls', (0,0,0) is usually the wrist.
        // We'll offset it to sit in the grip.
        this.wandContainer.setAttribute('position', '0.04 0.05 -0.1');
        this.wandContainer.setAttribute('rotation', '-45 0 0'); // Point forward-ish

        // Wand Shaft
        const shaft = document.createElement('a-entity');
        shaft.setAttribute('geometry', `primitive: cylinder; radius: 0.01; height: ${this.data.wandLength}`);
        shaft.setAttribute('material', `color: ${this.data.wandColor}`);
        shaft.setAttribute('rotation', '90 0 0'); // Lay flat along Z
        shaft.setAttribute('position', `0 0 -${this.data.wandLength / 2}`); // Pivot at base
        this.wandContainer.appendChild(shaft);

        // Wand Tip (Glowing)
        this.tip = document.createElement('a-entity');
        this.tip.setAttribute('geometry', 'primitive: sphere; radius: 0.015');
        this.tip.setAttribute('material', 'color: #88ccff; emissive: #88ccff; emissiveIntensity: 0.5');
        this.tip.setAttribute('position', `0 0 -${this.data.wandLength}`);
        this.wandContainer.appendChild(this.tip);

        // Add to hand
        this.el.appendChild(this.wandContainer);

        // 2. Raycaster (Attached to the Tip or container)
        // We attach raycaster to the wand container so it points where the wand points
        this.wandContainer.setAttribute('raycaster', {
            objects: '[grabbable], .clickable',
            far: 20,
            showLine: true, // Show the ray coming out of the wand
            lineColor: '#88ccff',
            lineOpacity: 0.5,
            direction: new THREE.Vector3(0, 0, -1), // Standard forward
            origin: new THREE.Vector3(0, 0, -this.data.wandLength) // Start at tip
        });

        // Bind event listeners (we listen on the wand container for raycaster events now!)
        this.onRaycasterIntersection = this.onRaycasterIntersection.bind(this);
        this.onRaycasterIntersectionCleared = this.onRaycasterIntersectionCleared.bind(this);
        this.onGripDown = this.onGripDown.bind(this);
        this.onGripUp = this.onGripUp.bind(this);
    },

    play: function () {
        this.wandContainer.addEventListener('raycaster-intersection', this.onRaycasterIntersection);
        this.wandContainer.addEventListener('raycaster-intersection-cleared', this.onRaycasterIntersectionCleared);

        // Inputs still come from the hand entity
        this.el.addEventListener('gripdown', this.onGripDown);
        this.el.addEventListener('gripup', this.onGripUp);
        this.el.addEventListener('pinchstarted', this.onGripDown);
        this.el.addEventListener('pinchended', this.onGripUp);
    },

    pause: function () {
        if (this.wandContainer) {
            this.wandContainer.removeEventListener('raycaster-intersection', this.onRaycasterIntersection);
            this.wandContainer.removeEventListener('raycaster-intersection-cleared', this.onRaycasterIntersectionCleared);
        }
        this.el.removeEventListener('gripdown', this.onGripDown);
        this.el.removeEventListener('gripup', this.onGripUp);
        this.el.removeEventListener('pinchstarted', this.onGripDown);
        this.el.removeEventListener('pinchended', this.onGripUp);
    },

    onRaycasterIntersection: function (evt) {
        const intersections = this.wandContainer.components.raycaster.intersections;
        if (intersections && intersections.length > 0) {
            this.targetEl = intersections[0].object.el;
            this.targetEl.setAttribute('material', 'emissive', '#333');
            console.log("Wand Hit:", this.targetEl.id);

            // Visual feedback: Tip glows brighter
            this.tip.setAttribute('material', 'emissiveIntensity', '1.0');
        }
    },

    onRaycasterIntersectionCleared: function () {
        if (this.targetEl) {
            this.targetEl.setAttribute('material', 'emissive', '#000');
            this.targetEl = null;

            // Visual feedback: Tip dim
            this.tip.setAttribute('material', 'emissiveIntensity', '0.5');
        }
    },

    onGripDown: function (evt) {
        console.log("Wand Cast:", evt ? evt.type : 'unknown');
        if (this.activeSpell === 'wingardium_leviosa' && this.targetEl) {
            // Check if it's a UI button (Restart)
            if (this.targetEl.getAttribute('scene-restarter') !== null) {
                // It's a button, click it!
                this.targetEl.emit('click');
                return;
            }

            console.log("Force Grabbing", this.targetEl);
            this.forceGrab.grab(this.targetEl);

            // Visuals: Tip turns red
            this.tip.setAttribute('material', 'color', '#ff0000');
            this.tip.setAttribute('material', 'emissive', '#ff0000');
            this.wandContainer.setAttribute('raycaster', 'lineColor', '#ff0000');
        }
    },

    onGripUp: function (evt) {
        if (this.activeSpell === 'wingardium_leviosa') {
            this.forceGrab.release();

            // Reset visuals
            this.tip.setAttribute('material', 'color', '#88ccff');
            this.tip.setAttribute('material', 'emissive', '#88ccff');
            this.wandContainer.setAttribute('raycaster', 'lineColor', '#88ccff');
        }
    }
});
