// Declaração das variáveis que estavam faltando
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;

export { setupTouchControls, touchControlsEnabled, lookDelta, moveForward, moveBackward, moveLeft, moveRight };

// --- Mobile Touch Controls Logic ---
let touchControlsEnabled = false;
let joystickActive = false;
let lookTouchId = null;
let joystickTouchId = null;
let joystickCenter = { x: 0, y: 0 };
let joystickCurrent = { x: 0, y: 0 };
let lookStart = { x: 0, y: 0 };
let lookCurrent = { x: 0, y: 0 };
let lookDelta = { x: 0, y: 0 };
const lookSensitivity = 0.002;
const joystickRadius = 60; // Matches CSS width/2

function setupTouchControls() {
    const touchControlsDiv = document.getElementById('touch-controls');
    const joystickArea = document.getElementById('joystick-area');
    const joystickThumb = document.getElementById('joystick-thumb');
    const lookArea = document.getElementById('look-area');

    // Basic check for touch device
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        touchControlsEnabled = true;
        touchControlsDiv.style.display = 'block';
        console.log("Touch controls enabled.");        // Disable PointerLockControls for touch (No longer needed here as PointerLockControls is not initialized in mobile mode)
        // controls.enabled = false;        // Remove desktop click listener if touch is enabled
        // This might need refinement - maybe keep click for desktop fallback?
        // document.removeEventListener('click', desktopClickListener);

        // --- Joystick Events ---
        joystickArea.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (!joystickActive) {
                joystickTouchId = e.changedTouches[0].identifier;
                joystickActive = true;
                const rect = joystickArea.getBoundingClientRect();
                joystickCenter.x = rect.left + rect.width / 2;
                joystickCenter.y = rect.top + rect.height / 2;
                joystickCurrent.x = e.changedTouches[0].clientX;
                joystickCurrent.y = e.changedTouches[0].clientY;
                joystickThumb.style.backgroundColor = 'rgba(255, 255, 255, 0.8)'; // Highlight active
                if (!timerInterval && !gameWon) startTimer(); // Start timer on first interaction
            }
        }, { passive: false });

        joystickArea.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (joystickActive) {
                for (let i = 0; i < e.changedTouches.length; i++) {
                    if (e.changedTouches[i].identifier === joystickTouchId) {
                        joystickCurrent.x = e.changedTouches[i].clientX;
                        joystickCurrent.y = e.changedTouches[i].clientY;

                        let deltaX = joystickCurrent.x - joystickCenter.x;
                        let deltaY = joystickCurrent.y - joystickCenter.y;
                        let distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                        let clampedDistance = Math.min(distance, joystickRadius);
                        let angle = Math.atan2(deltaY, deltaX);

                        let thumbX = Math.cos(angle) * clampedDistance;
                        let thumbY = Math.sin(angle) * clampedDistance;

                        joystickThumb.style.left = `calc(50% + ${thumbX}px)`;
                        joystickThumb.style.top = `calc(50% + ${thumbY}px)`;

                        // Convert joystick position to movement flags (simplified)
                        let normalizedX = deltaX / joystickRadius;
                        let normalizedY = deltaY / joystickRadius;

                        moveForward = normalizedY < -0.2;
                        moveBackward = normalizedY > 0.2;
                        moveLeft = normalizedX < -0.2;
                        moveRight = normalizedX > 0.2;
                        break;
                    }
                }
            }
        }, { passive: false });

        const joystickEndHandler = (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === joystickTouchId) {
                    joystickActive = false;
                    joystickTouchId = null;
                    joystickThumb.style.left = '50%';
                    joystickThumb.style.top = '50%';
                    joystickThumb.style.backgroundColor = 'rgba(200, 200, 200, 0.6)';
                    moveForward = moveBackward = moveLeft = moveRight = false;
                    break;
                }
            }
        };
        joystickArea.addEventListener('touchend', joystickEndHandler);
        joystickArea.addEventListener('touchcancel', joystickEndHandler);

        // --- Look Events ---
        lookArea.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (lookTouchId === null) { // Only track the first touch in this area
                lookTouchId = e.changedTouches[0].identifier;
                lookStart.x = e.changedTouches[0].clientX;
                lookStart.y = e.changedTouches[0].clientY;
                lookCurrent.x = lookStart.x;
                lookCurrent.y = lookStart.y;
                lookDelta.x = 0;
                lookDelta.y = 0;
                if (!timerInterval && !gameWon) startTimer(); // Start timer on first interaction
            }
        }, { passive: false });

        lookArea.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (lookTouchId !== null) {
                for (let i = 0; i < e.changedTouches.length; i++) {
                    if (e.changedTouches[i].identifier === lookTouchId) {
                        lookCurrent.x = e.changedTouches[i].clientX;
                        lookCurrent.y = e.changedTouches[i].clientY;

                        lookDelta.x = lookCurrent.x - lookStart.x;
                        lookDelta.y = lookCurrent.y - lookStart.y;

                        // Apply rotation based on delta (will be used in animate loop)
                        // Reset start for continuous movement feel
                        lookStart.x = lookCurrent.x;
                        lookStart.y = lookCurrent.y;
                        break;
                    }
                }
            }
        }, { passive: false });

        const lookEndHandler = (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === lookTouchId) {
                    lookTouchId = null;
                    lookDelta.x = 0;
                    lookDelta.y = 0;
                    break;
                }
            }
        };
        lookArea.addEventListener('touchend', lookEndHandler);
        lookArea.addEventListener('touchcancel', lookEndHandler);

    } else {
        console.log("Touch controls not enabled.");
        // Ensure desktop controls remain active if touch isn't detected
        // Re-add click listener if it was removed?
        // document.addEventListener('click', desktopClickListener);
    }
}

// Need to call setupTouchControls() after init()

// Modify animate() to handle touch look

