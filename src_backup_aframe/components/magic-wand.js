/* global AFRAME */

/**
 * Magic Wand Component
 * Attached to a physical entity in the scene.
 * When grabbed by super-hands, it receives input events to cast spells.
 */
AFRAME.registerComponent('magic-wand', {
    init: function () {
        this.activeSpell = 'wingardium_leviosa';
        this.isHeld = false;
        this.holderEl = null;

        // Visuals (if not already set in HTML, we can enhance here)
        // We assume the entity has geometry/material from HTML or mixin

        // Raycaster: Attached to the wand tip
        // We'll assume the wand is roughly 0.3m long, pointing -Z
        // We attach the raycaster to this entity.
        this.el.setAttribute('raycaster', {
            objects: '[grabbable], .clickable',
            far: 20,
            showLine: true,
            lineColor: '#88ccff',
            lineOpacity: 0.5,
            enabled: true // Always enabled? Or only when held? Let's leave enabled for "remote" look
        });

        // Force Grab logic (we reuse the component, but we need to know WHERE to pull to)
        // Issue: 'force-grab' component assumes 'this.el' is the source of the pull (the hand).
        // If we put 'force-grab' on the WAND, objects will fly to the WAND. That's actually perfect!
        // Components
        this.el.setAttribute('force-grab', '');
        this.forceGrab = this.el.components['force-grab'];

        this.el.setAttribute('invito-summon', '');
        this.invito = this.el.components['invito-summon'];

        // Bind events
        this.onGrabStart = this.onGrabStart.bind(this);
        this.onGrabEnd = this.onGrabEnd.bind(this);
        this.onTriggerDown = this.onTriggerDown.bind(this);
        this.onTriggerUp = this.onTriggerUp.bind(this);
        this.onRayIntersection = this.onRayIntersection.bind(this);
        this.onRayCleared = this.onRayCleared.bind(this);

        // Super-Hands Life-Cycle Events
        this.el.addEventListener('grab-start', this.onGrabStart);
        this.el.addEventListener('grab-end', this.onGrabEnd);

        // Raycaster Events
        this.el.addEventListener('raycaster-intersection', this.onRayIntersection);
        this.el.addEventListener('raycaster-intersection-cleared', this.onRayCleared);

        // Input Events (Bubbled from hand via super-hands)
        // We listen for both controller (trigger) and hand (pinch)
        this.el.addEventListener('triggerdown', this.onTriggerDown);
        this.el.addEventListener('pinchstarted', this.onTriggerDown);

        // Grip (Fist) for Invito
        this.el.addEventListener('gripdown', this.onTriggerDown);
        this.el.addEventListener('gripup', this.onTriggerUp);

        this.el.addEventListener('triggerup', this.onTriggerUp);
        this.el.addEventListener('pinchended', this.onTriggerUp);

        // Debug
        console.log("Magic Wand Initialized with Invito");
    },

    onGrabStart: function (evt) {
        console.log("Wand Grabbed by", evt.detail.hand.id);
        this.isHeld = true;
        this.holderEl = evt.detail.hand;
        // Optional: Change appearance when held?
    },

    onGrabEnd: function (evt) {
        console.log("Wand Released");
        this.isHeld = false;
        this.holderEl = null;
        this.forceGrab.release(); // Safety release
        this.invito.release();
    },

    onRayIntersection: function (evt) {
        const els = evt.detail.els;
        if (els && els.length > 0) {
            this.targetEl = els[0];
            this.targetEl.setAttribute('material', 'emissive', '#333');
            // Glow tip?
            this.el.setAttribute('raycaster', 'lineColor', '#aaccff');
        }
    },

    onRayCleared: function (evt) {
        if (this.targetEl) {
            this.targetEl.setAttribute('material', 'emissive', '#000');
            this.targetEl = null;
            this.el.setAttribute('raycaster', 'lineColor', '#88ccff');
        }
    },

    onTriggerDown: function (evt) {
        // Only cast if held!
        if (!this.isHeld) return;

        console.log("Wand Trigger!", evt.type);

        const isFist = evt.type === 'gripdown';

        if (isFist) {
            // INVITO (Grip/Fist)
            if (this.targetEl) {
                console.log("Casting Invito!", this.targetEl);
                this.invito.summon(this.targetEl);
                this.el.setAttribute('raycaster', 'lineColor', '#00ff00'); // Green for summon
            }
        } else {
            // WINGARDIUM LEVIOSA (Trigger/Pinch)
            if (this.targetEl) {
                // UI Check
                if (this.targetEl.getAttribute('scene-restarter') !== null) {
                    this.targetEl.emit('click');
                    return;
                }

                console.log("Force Grabbing", this.targetEl);
                this.forceGrab.grab(this.targetEl);
                this.el.setAttribute('raycaster', 'lineColor', '#ff0000'); // Red
            }
        }
    },

    onTriggerUp: function (evt) {
        if (!this.isHeld) return;

        const isFist = evt.type === 'gripup';

        if (isFist) {
            this.invito.release();
            this.el.setAttribute('raycaster', 'lineColor', '#88ccff');
        } else {
            this.forceGrab.release();
            this.el.setAttribute('raycaster', 'lineColor', '#88ccff');
        }
    }
});
