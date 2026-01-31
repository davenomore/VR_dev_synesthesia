# Gesture System Documentation

This document explains the solution implemented to fix gesture flickering and how to add new gestures in the future.

## 1. Stability & Hysteresis (The "Flicker" Fix)

To prevent gestures (like Pinch) from flickering on/off when your hand is near the boundary, we implemented two mechanisms in `src/systems/gesture-detector.js`:

### A. Hysteresis (State Memory)
Instead of a single distance threshold (e.g., "activate if < 2cm"), we use two:
- **Enter Threshold (`PINCH_ENTER`)**: **2.5cm**. You must be closer than this to *start* pinching.
- **Exit Threshold (`PINCH_EXIT`)**: **4.0cm**. You must move further than this to *stop* pinching.

This creates a "sticky" zone where minor hand tremors won't break the gesture.

### B. Frame Stability
We require a gesture to be detected for **8 consecutive frames** (`STABILITY_THRESHOLD`) before identifying it. This filters out tracking noise/glitches.

## 2. Attractor Logic

The interaction with particles is handled by two components:

1.  **`hand-attractor.js`**:
    - Listens for gesture events (e.g., `gesture-pinch`).
    - When active, adds itself to the particle system.
    - **Mega Pinch Settings**: Strength: 50, Radius: 3.0 (strong remote pull).

2.  **`synesthetic-particles.js`**:
    - Calculates physics for each particle.
    - Distinguishes behavior based on which hand is active:
        - **Left Hand**: Vortex physics (Spin + Pull).
        - **Right Hand**: Black Hole physics (Pure Pull + Event Horizon Jitter).
        - **Center**: Disk/Shell physics (Pull + Central Repulsion).

## 3. How to Add New Gestures

To add a new gesture (e.g., "Fist"):

1.  **Detect**: In `systems/gesture-detector.js`, add a detection function (e.g., `isFist()`) and call it in `classifyGesture()`.
2.  **Emit**: The system automatically emits events like `gesture-fist` and `gesture-fist-end`.
3.  **React**: In `components/hand-attractor.js` (or a new component), listen for these events:
    ```javascript
    this.el.addEventListener('gesture-fist', () => {
        // Change physics mode or activate effect
    });
    ```
