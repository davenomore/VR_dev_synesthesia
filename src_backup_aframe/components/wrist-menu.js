/* global AFRAME */

/**
 * Wrist Menu Component
 * Attached to a hand (normally left).
 * Toggles the visibility of a child entity (the menu) when a specific gesture (Pinch) is performed.
 */
AFRAME.registerComponent('wrist-menu', {
    schema: {
        menuId: { type: 'string', default: 'menu-panel' },
        toggleGesture: { type: 'string', default: 'pinchstarted' }
    },

    init: function () {
        this.menuEl = document.getElementById(this.data.menuId);
        this.visible = false;

        if (!this.menuEl) {
            console.warn("Wrist Menu: Menu element not found with ID", this.data.menuId);
            return;
        }

        // Hide by default
        this.menuEl.setAttribute('visible', false);

        // Bind
        this.onToggle = this.onToggle.bind(this);

        // Listen to gesture on THIS hand
        this.el.addEventListener(this.data.toggleGesture, this.onToggle);
    },

    onToggle: function () {
        this.visible = !this.visible;
        this.menuEl.setAttribute('visible', this.visible);

        // Optional: Play sound or haptic feedback
        console.log("Wrist Menu Toggled:", this.visible);

        // Safety: If we just opened it, ensure it's positioned correctly?
        // Since it's a child of the hand, it moves with it.
    }
});
