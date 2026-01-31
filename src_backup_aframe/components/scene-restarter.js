/* global AFRAME */

/**
 * Scene Restarter Component
 * Reloads the page when triggered (e.g., by a button press or gesture).
 */
AFRAME.registerComponent('scene-restarter', {
    init: function () {
        this.el.addEventListener('click', function () {
            location.reload();
        });
    }
});
