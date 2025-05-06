import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { setupTouchControls, touchControlsEnabled, lookDelta, moveForward as touchMoveForward, moveBackward as touchMoveBackward, moveLeft as touchMoveLeft, moveRight as touchMoveRight } from './touch_controls.js';

// Default to false, will be set based on user choice
let isMobile = false;
let controlMode = null; // 'desktop' or 'mobile'

let scene, camera, renderer, controls;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let prevTime = performance.now();

let currentMazeSize = 10; // Start size, will increase
let actualMazeWidth, actualMazeHeight;
const wallHeight = 2.5;
const wallThickness = 0.1;
const cellSize = 2;
const playerHeight = 1.6;
const playerSpeed = 5.0;
const playerRadius = 0.3;

let maze = [];
let walls = [];
let floor, ceiling, exitMarker;
let startTime, timerInterval;
const timerElement = document.getElementById('timer');
const storyDisplayElement = document.getElementById('story-display');
const keyDisplayElement = document.getElementById('key-display'); // Get key display element
let gameWon = false;
let exitPosition = new THREE.Vector3();

// Raycaster for collision
const raycaster = new THREE.Raycaster();
const collisionDistance = playerRadius + wallThickness / 2 + 0.05;

// Flashlight
let flashlight;
let flashlightTarget;

// Audio
let listener, audioLoader;
let footstepSound, collisionSound, victorySound, collectSound, keyCollectSound; // Added keyCollectSound
let isMoving = false;
let distanceMovedSinceLastStep = 0;
const footstepDistanceThreshold = 0.8; // Play sound every X units moved
let lastPlayerPosition = new THREE.Vector3(); // Track position for distance

// Collectibles
let collectibles = [];
const collectibleRadius = 0.2;
const numCollectiblesPerLevel = 3; // Number of story pieces per maze
const minCollectibleDistance = cellSize * 5; // Minimum distance between collectibles - Increased
const storySnippets = [
    "Fragmento 1: ...o sinal ficou fraco aqui...",
    "Fragmento 2: ...parece uma estrutura antiga...",
    "Fragmento 3: ...energia estranha emanando das paredes...",
    "Fragmento 4: ...não estou sozinho...",
    "Fragmento 5: ...a saída deve estar perto...",
    "Fragmento 6: ...preciso encontrar a chave...", // Hint for key system
    "Fragmento 7: ...registros corrompidos...",
    "Fragmento 8: ...algo me observa...",
    "Fragmento 9: ...o tempo está se esgotando...",
    "Fragmento 10: ...será que consigo sair?"
];
let collectedStory = "";

// Keys
let keys = [];
const keyRadius = 0.25;
let numKeysNeeded = 1; // Start with 1 key needed, can increase with level
let keysCollected = 0;

// Theme settings
let currentTheme = 'brick';
const textureLoader = new THREE.TextureLoader();
const textures = {
    brick: {
        wall: textureLoader.load('textures/brick_wall.jpeg'),
        floor: textureLoader.load('textures/brick_wall.jpeg'),
        ceiling: textureLoader.load('textures/brick_wall.jpeg'),
        skyColor: 0x222222,
        fogColor: 0x222222
    },
    garden: {
        wall: textureLoader.load('textures/foliage.png'),
        floor: textureLoader.load('textures/foliage.png'),
        ceiling: null,
        skyColor: 0x87CEEB,
        fogColor: 0xADD8E6
    },
    metal: {
        wall: textureLoader.load('textures/metal_plate.png'),
        floor: textureLoader.load('textures/metal_plate.png'),
        ceiling: textureLoader.load('textures/metal_plate.png'),
        skyColor: 0x111118,
        fogColor: 0x111118
    }
};

// Materials
let wallMaterial = new THREE.MeshStandardMaterial();
let floorMaterial = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide });
let ceilingMaterial = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide });
const collectibleMaterial = new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xccaa00 }); // Gold-like material
const keyMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, emissive: 0x888888, roughness: 0.3, metalness: 0.8 }); // Silver-like material
const exitLockedMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true }); // Red wireframe for locked exit
const exitUnlockedMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true }); // Green wireframe for unlocked exit

function configureTexture(texture, repeatX, repeatY) {
    if (!texture) return;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
}

function setupTextures() {
    const repeatFactorWall = cellSize / 2;
    const repeatFactorFloor = actualMazeWidth ? actualMazeWidth / 2 : currentMazeSize / 2;
    const repeatFactorCeiling = actualMazeHeight ? actualMazeHeight / 2 : currentMazeSize / 2;

    for (const themeName in textures) {
        const themeTextures = textures[themeName];
        configureTexture(themeTextures.wall, repeatFactorWall, repeatFactorWall * (wallHeight / cellSize));
        configureTexture(themeTextures.floor, repeatFactorFloor, repeatFactorCeiling);
        configureTexture(themeTextures.ceiling, repeatFactorFloor, repeatFactorCeiling);
    }
}

// Modified setTheme to regenerate maze
function setTheme(themeName) {
    if (!textures[themeName] || themeName === currentTheme) return; // Don't regenerate if theme is the same
    currentTheme = themeName;
    console.log("Changing theme to:", currentTheme, "- Regenerating maze...");

    // Regenerate maze for the new theme
    generateAndBuildMaze(currentMazeSize);

    // Apply visual theme settings AFTER maze is rebuilt
    const theme = textures[currentTheme];
    wallMaterial.map = theme.wall;
    floorMaterial.map = theme.floor;
    if (ceiling) {
        ceilingMaterial.map = theme.ceiling;
        ceiling.visible = !!theme.ceiling;
    }

    scene.background = new THREE.Color(theme.skyColor);
    scene.fog.color.setHex(theme.fogColor);

    wallMaterial.needsUpdate = true;
    floorMaterial.needsUpdate = true;
    if (ceiling) ceilingMaterial.needsUpdate = true;

    console.log("Theme set and maze regenerated for:", currentTheme);
}

// Primeira função init() renomeada para originalInit()
function originalInit() {
    // Scene
    scene = new THREE.Scene();
    // Adjust fog based on device type (closer fog for mobile)
    const isMobile = ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    const fogDistance = isMobile ? 4 * cellSize : 8 * cellSize;
    scene.fog = new THREE.Fog(0x000000, 0, fogDistance);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.y = playerHeight;

    // Audio Setup
    listener = new THREE.AudioListener();
    camera.add(listener);
    audioLoader = new THREE.AudioLoader();

    // Load Sounds
    audioLoader.load('sounds/footsteps.mp3', function(buffer) {
        footstepSound = new THREE.Audio(listener);
        footstepSound.setBuffer(buffer);
        footstepSound.setLoop(false);
        footstepSound.setVolume(0.4);
    });
    // Collision sound removed as requested
    // audioLoader.load('sounds/collision.mp3', function(buffer) {
    //     collisionSound = new THREE.Audio(listener);
    //     collisionSound.setBuffer(buffer);
    //     collisionSound.setLoop(false);
    //     collisionSound.setVolume(0.6);
    // });
    audioLoader.load('sounds/victory.mp3', function(buffer) {
        victorySound = new THREE.Audio(listener);
        victorySound.setBuffer(buffer);
        victorySound.setLoop(false);
        victorySound.setVolume(0.7);
    });
    audioLoader.load('sounds/collect.mp3', function(buffer) { // Story collect sound
        collectSound = new THREE.Audio(listener);
        collectSound.setBuffer(buffer);
        collectSound.setLoop(false);
        collectSound.setVolume(0.5);
    }, undefined, function (err) {
        console.warn('Could not load collect sound effect.');
    });
    audioLoader.load('sounds/key_collect.mp3', function(buffer) { // Key collect sound
        keyCollectSound = new THREE.Audio(listener);
        keyCollectSound.setBuffer(buffer);
        keyCollectSound.setLoop(false);
        keyCollectSound.setVolume(0.6);
    }, undefined, function (err) {
        console.warn('Could not load key collect sound effect.');
    });

    // Flashlight Setup
    flashlight = new THREE.SpotLight(0xffffff, 1.5, 15 * cellSize, Math.PI / 6, 0.3, 1.5);
    flashlight.castShadow = false;
    flashlightTarget = new THREE.Object3D();
    flashlight.target = flashlightTarget;
    camera.add(flashlight);
    camera.add(flashlightTarget);
    flashlight.position.set(0, 0, 0.1);
    flashlightTarget.position.set(0, 0, -1);    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Adjust pixel ratio for performance on mobile
    const pixelRatio = isMobile ? Math.min(window.devicePixelRatio, 1.5) : window.devicePixelRatio;
    renderer.setPixelRatio(pixelRatio);
    document.getElementById('container').appendChild(renderer.domElement);

    // Controls
    controls = new PointerLockControls(camera, renderer.domElement);
    scene.add(controls.getObject());
    lastPlayerPosition.copy(controls.getObject().position); // Initialize last position

    document.addEventListener('click', () => {
        if (!gameWon) controls.lock();
    });
    controls.addEventListener('lock', () => {
        console.log('Pointer Locked');
        if (!gameWon) startTimer();
    });
    controls.addEventListener('unlock', () => {
        console.log('Pointer Unlocked');
        stopTimer();
    });

    // Keyboard
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x606060, 0.8);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 0.5, 25 * cellSize);
    scene.add(pointLight);

    // Generate Maze FIRST
    generateAndBuildMaze(currentMazeSize);

    // Set initial theme (without regenerating maze)
    const initialTheme = textures[currentTheme];
    wallMaterial.map = initialTheme.wall;
    floorMaterial.map = initialTheme.floor;
    if (ceiling) {
        ceilingMaterial.map = initialTheme.ceiling;
        ceiling.visible = !!initialTheme.ceiling;
    }
    scene.background = new THREE.Color(initialTheme.skyColor);
    scene.fog.color.setHex(initialTheme.fogColor);
    wallMaterial.needsUpdate = true;
    floorMaterial.needsUpdate = true;
    if (ceiling) ceilingMaterial.needsUpdate = true;

    // Theme Buttons - Now call setTheme which regenerates the maze
    document.getElementById('theme-brick').addEventListener('click', () => setTheme('brick'));
    document.getElementById('theme-garden').addEventListener('click', () => setTheme('garden'));
    document.getElementById('theme-metal').addEventListener('click', () => setTheme('metal'));

    // Start animation
    animate();
}

// Function to generate and build maze
function generateAndBuildMaze(size) {
    maze = generateMazeDFS(size, size);
    actualMazeWidth = maze[0].length;
    actualMazeHeight = maze.length;

    // Determine number of keys needed based on maze size (optional)
    numKeysNeeded = Math.max(1, Math.floor(size / 10)); // Example: 1 key for 10x10, 2 for 20x20 etc.

    setupTextures();

    const pointLight = scene.getObjectByProperty('type', 'PointLight');
    if (pointLight) {
        pointLight.position.set(actualMazeWidth * cellSize / 2, wallHeight * 1.5, actualMazeHeight * cellSize / 2);
    }

    buildMazeGeometry(); // Builds walls, floor, ceiling, exit
    placeCollectibles(); // Place story collectibles
    placeKeys(); // Place keys
    setStartPosition();

    gameWon = false;
    const winMessage = document.getElementById('win-message');
    if (winMessage) winMessage.remove();
    timerElement.textContent = 'Tempo: 0s';
    stopTimer();

    // Reset story and key display
    collectedStory = "";
    keysCollected = 0;
    updateStoryDisplay();
    updateKeyDisplay();
}

function onKeyDown(event) {
    if (gameWon) return;
    switch (event.code) {
        case 'ArrowUp': case 'KeyW': moveForward = true; break;
        case 'ArrowLeft': case 'KeyA': moveLeft = true; break;
        case 'ArrowDown': case 'KeyS': moveBackward = true; break;
        case 'ArrowRight': case 'KeyD': moveRight = true; break;
    }
}

function onKeyUp(event) {
    switch (event.code) {
        case 'ArrowUp': case 'KeyW': moveForward = false; break;
        case 'ArrowLeft': case 'KeyA': moveLeft = false; break;
        case 'ArrowDown': case 'KeyS': moveBackward = false; break;
        case 'ArrowRight': case 'KeyD': moveRight = false; break;
    }
}

// --- Maze Generation (DFS - unchanged) ---
function generateMazeDFS(width, height) {
    width = width % 2 === 0 ? width + 1 : width;
    height = height % 2 === 0 ? height + 1 : height;
    let grid = Array(height).fill(null).map(() => Array(width).fill(1));
    let stack = [];
    let startX = 1, startY = 1;
    grid[startY][startX] = 0;
    stack.push([startX, startY]);
    while (stack.length > 0) {
        let [cx, cy] = stack[stack.length - 1];
        let neighbors = [];
        const directions = [[0, -2], [0, 2], [-2, 0], [2, 0]];
        directions.sort(() => Math.random() - 0.5);
        for (let [dx, dy] of directions) {
            let nx = cx + dx;
            let ny = cy + dy;
            if (nx > 0 && nx < width - 1 && ny > 0 && ny < height - 1 && grid[ny][nx] === 1) {
                neighbors.push([nx, ny, dx, dy]);
            }
        }
        if (neighbors.length > 0) {
            let [nx, ny, dx, dy] = neighbors[0];
            grid[ny][nx] = 0;
            grid[cy + dy / 2][cx + dx / 2] = 0;
            stack.push([nx, ny]);
        } else {
            stack.pop();
        }
    }
    let exitX = -1;
    for (let x = width - 2; x >= 1; x--) {
        if (grid[height - 2][x] === 0) {
            grid[height - 1][x] = 'E';
            exitX = x;
            exitPosition.set(x * cellSize, playerHeight / 2, (height - 1) * cellSize);
            break;
        }
    }
    if (exitX === -1) {
        grid[height - 1][width - 2] = 'E';
        exitPosition.set((width - 2) * cellSize, playerHeight / 2, (height - 1) * cellSize);
    }
    console.log(`Generated Maze ${width}x${height}`);
    return grid;
}

// --- Build Maze Geometry ---
function buildMazeGeometry() {
    // Clear previous maze elements
    walls.forEach(wall => scene.remove(wall));
    collectibles.forEach(c => scene.remove(c)); // Clear collectibles
    keys.forEach(k => scene.remove(k)); // Clear keys
    if (floor) scene.remove(floor);
    if (ceiling) scene.remove(ceiling);
    if (exitMarker) scene.remove(exitMarker);
    walls = [];
    collectibles = []; // Reset arrays
    keys = []; // Reset arrays

    const verticalWallGeom = new THREE.BoxGeometry(wallThickness, wallHeight, cellSize + wallThickness);
    const horizontalWallGeom = new THREE.BoxGeometry(cellSize + wallThickness, wallHeight, wallThickness);
    const mazePixelWidth = actualMazeWidth * cellSize;
    const mazePixelHeight = actualMazeHeight * cellSize;

    // Floor
    floor = new THREE.Mesh(new THREE.PlaneGeometry(mazePixelWidth, mazePixelHeight), floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set((actualMazeWidth / 2) * cellSize - cellSize / 2, 0, (actualMazeHeight / 2) * cellSize - cellSize / 2);
    scene.add(floor);

    // Ceiling
    ceiling = new THREE.Mesh(new THREE.PlaneGeometry(mazePixelWidth, mazePixelHeight), ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set((actualMazeWidth / 2) * cellSize - cellSize / 2, wallHeight, (actualMazeHeight / 2) * cellSize - cellSize / 2);
    scene.add(ceiling);
    ceiling.visible = !!textures[currentTheme].ceiling;

    // Walls and Exit Marker
    for (let y = 0; y < actualMazeHeight; y++) {
        for (let x = 0; x < actualMazeWidth; x++) {
            // Vertical walls between cells
            if (x + 1 < actualMazeWidth && ((maze[y][x] !== 1 && maze[y][x+1] === 1) || (maze[y][x] === 1 && maze[y][x+1] !== 1))) {
                 const wall = new THREE.Mesh(verticalWallGeom, wallMaterial);
                 wall.position.set((x + 0.5) * cellSize, wallHeight / 2, y * cellSize);
                 scene.add(wall);
                 walls.push(wall);
            }
            // Horizontal walls between cells
            if (y + 1 < actualMazeHeight && ((maze[y][x] !== 1 && maze[y+1][x] === 1) || (maze[y][x] === 1 && maze[y+1][x] !== 1))) {
                const wall = new THREE.Mesh(horizontalWallGeom, wallMaterial);
                wall.position.set(x * cellSize, wallHeight / 2, (y + 0.5) * cellSize);
                scene.add(wall);
                walls.push(wall);
            }
            // Exit marker
            if (maze[y][x] === 'E') {
                const exitGeometry = new THREE.SphereGeometry(cellSize / 3, 16, 16);
                // Start with locked material
                exitMarker = new THREE.Mesh(exitGeometry, exitLockedMaterial);
                exitMarker.position.copy(exitPosition);
                scene.add(exitMarker);
            }
        }
    }

    // Boundary Walls
    const topWall = new THREE.Mesh(new THREE.BoxGeometry(mazePixelWidth, wallHeight, wallThickness), wallMaterial);
    topWall.position.set(mazePixelWidth / 2 - cellSize / 2, wallHeight / 2, -wallThickness / 2);
    scene.add(topWall); walls.push(topWall);

    const bottomWall = new THREE.Mesh(new THREE.BoxGeometry(mazePixelWidth, wallHeight, wallThickness), wallMaterial);
    bottomWall.position.set(mazePixelWidth / 2 - cellSize / 2, wallHeight / 2, mazePixelHeight - cellSize + wallThickness / 2);
    scene.add(bottomWall); walls.push(bottomWall);

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, mazePixelHeight), wallMaterial);
    leftWall.position.set(-wallThickness / 2, wallHeight / 2, mazePixelHeight / 2 - cellSize / 2);
    scene.add(leftWall); walls.push(leftWall);

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, mazePixelHeight), wallMaterial);
    rightWall.position.set(mazePixelWidth - cellSize + wallThickness / 2, wallHeight / 2, mazePixelHeight / 2 - cellSize / 2);
    scene.add(rightWall); walls.push(rightWall);

    console.log(`Built maze geometry with ${walls.length} walls.`);
}

// --- Place Collectibles (Improved Spacing) ---
function placeCollectibles() {
    // Clear previous collectibles (already done in buildMazeGeometry, but good practice)
    collectibles.forEach(c => scene.remove(c));
    collectibles = [];

    const collectibleGeometry = new THREE.IcosahedronGeometry(collectibleRadius, 0); // Simple shape
    const availableCells = [];
    for (let y = 1; y < actualMazeHeight - 1; y++) {
        for (let x = 1; x < actualMazeWidth - 1; x++) {
            if (maze[y][x] === 0) { // Place only in open cells
                // Avoid placing too close to start or exit
                const startDist = Math.sqrt(Math.pow(x - 1, 2) + Math.pow(y - 1, 2));
                const exitDist = Math.sqrt(Math.pow(x * cellSize - exitPosition.x, 2) + Math.pow(y * cellSize - exitPosition.z, 2));
                if (startDist > 2 && exitDist > cellSize * 1.5) {
                    availableCells.push({ x, y });
                }
            }
        }
    }

    availableCells.sort(() => Math.random() - 0.5); // Shuffle cells

    const snippetsForLevel = storySnippets.sort(() => Math.random() - 0.5).slice(0, numCollectiblesPerLevel);
    let placedCount = 0;

    for (const cell of availableCells) {
        if (placedCount >= numCollectiblesPerLevel) break;

        const potentialPos = new THREE.Vector3(cell.x * cellSize, playerHeight / 2, cell.y * cellSize);
        let tooClose = false;

        // Check distance from already placed collectibles
        for (const existingCollectible of collectibles) {
            if (potentialPos.distanceTo(existingCollectible.position) < minCollectibleDistance) {
                tooClose = true;
                break;
            }
        }

        if (!tooClose) {
            const collectible = new THREE.Mesh(collectibleGeometry, collectibleMaterial);
            collectible.position.copy(potentialPos);
            collectible.userData.story = snippetsForLevel[placedCount] || "Fragmento perdido..."; // Assign story snippet
            scene.add(collectible);
            collectibles.push(collectible);
            placedCount++;
        }
    }
    console.log(`Placed ${collectibles.length} collectibles.`);
}

// --- Place Keys (Guaranteed Placement) ---
function placeKeys() {
    // Clear previous keys
    keys.forEach(k => scene.remove(k));
    keys = [];

    const keyGeometry = new THREE.TorusGeometry(keyRadius * 0.6, keyRadius * 0.2, 8, 24);
    const idealAvailableCells = [];
    const allOpenCells = []; // For fallback

    // First pass: Identify ideal cells and all open cells
    for (let y = 1; y < actualMazeHeight - 1; y++) {
        for (let x = 1; x < actualMazeWidth - 1; x++) {
            if (maze[y][x] === 0) { // Open cell
                const cellPos = { x, y };
                allOpenCells.push(cellPos); // Add to fallback list

                // Check ideal conditions
                const startDist = Math.sqrt(Math.pow(x - 1, 2) + Math.pow(y - 1, 2));
                const exitDist = Math.sqrt(Math.pow(x * cellSize - exitPosition.x, 2) + Math.pow(y * cellSize - exitPosition.z, 2));
                let tooCloseToCollectible = false;
                for(const coll of collectibles) {
                    // Check distance based on cell coordinates for simplicity here
                    if (Math.sqrt(Math.pow(x - (coll.position.x / cellSize), 2) + Math.pow(y - (coll.position.z / cellSize), 2)) * cellSize < minCollectibleDistance) {
                        tooCloseToCollectible = true;
                        break;
                    }
                }
                if (startDist > 2 && exitDist > cellSize * 1.5 && !tooCloseToCollectible) { // Use relaxed constraints for ideal
                    idealAvailableCells.push(cellPos);
                }
            }
        }
    }

    idealAvailableCells.sort(() => Math.random() - 0.5); // Shuffle ideal cells
    allOpenCells.sort(() => Math.random() - 0.5); // Shuffle all open cells

    let placedCount = 0;

    // Try placing in ideal cells first
    for (const cell of idealAvailableCells) {
        if (placedCount >= numKeysNeeded) break;

        const potentialPos = new THREE.Vector3(cell.x * cellSize, playerHeight / 2, cell.y * cellSize);
        let tooCloseToKey = false;
        for (const existingKey of keys) {
            if (potentialPos.distanceTo(existingKey.position) < minCollectibleDistance) {
                tooCloseToKey = true;
                break;
            }
        }

        if (!tooCloseToKey) {
            const key = new THREE.Mesh(keyGeometry, keyMaterial);
            key.position.copy(potentialPos);
            key.rotation.x = Math.PI / 2;
            key.userData.isKey = true;
            scene.add(key);
            keys.push(key);
            placedCount++;
        }
    }

    // Fallback: If not enough keys placed, use any open cell (avoiding start/exit/collectibles/other keys if possible)
    if (placedCount < numKeysNeeded) {
        console.warn(`Could only place ${placedCount}/${numKeysNeeded} keys ideally. Using fallback placement...`);
        for (const cell of allOpenCells) {
            if (placedCount >= numKeysNeeded) break;

            // Basic check: avoid start (1,1)
            if (cell.x === 1 && cell.y === 1) continue;
            // Avoid exit cell (more robust check)
            const exitCellX = Math.round(exitPosition.x / cellSize);
            const exitCellY = Math.round(exitPosition.z / cellSize);
            if (cell.x === exitCellX && cell.y === exitCellY) continue;

            const potentialPos = new THREE.Vector3(cell.x * cellSize, playerHeight / 2, cell.y * cellSize);

            // Check if this exact cell already has a key
            let cellOccupiedByKey = false;
            for (const existingKey of keys) {
                if (Math.round(existingKey.position.x / cellSize) === cell.x && Math.round(existingKey.position.z / cellSize) === cell.y) {
                    cellOccupiedByKey = true;
                    break;
                }
            }
             // Check if cell has a collectible
            let cellOccupiedByCollectible = false;
             for (const coll of collectibles) {
                 if (Math.round(coll.position.x / cellSize) === cell.x && Math.round(coll.position.z / cellSize) === cell.y) {
                     cellOccupiedByCollectible = true;
                     break;
                 }
             }

            if (!cellOccupiedByKey && !cellOccupiedByCollectible) { // Place if cell is free
                const key = new THREE.Mesh(keyGeometry, keyMaterial);
                key.position.copy(potentialPos);
                key.rotation.x = Math.PI / 2;
                key.userData.isKey = true;
                scene.add(key);
                keys.push(key);
                placedCount++;
                console.log(`Placed key #${placedCount} using fallback at (${cell.x}, ${cell.y})`);
            }
        }
    }

    // Ultimate Fallback: If still not enough keys (e.g., maze too small/dense), place near start
    if (placedCount < numKeysNeeded) {
        console.error(`CRITICAL: Fallback failed to place all keys! Placed ${placedCount}/${numKeysNeeded}. Placing remaining keys near start.`);
        const fallbackCells = [{x:1, y:3}, {x:3, y:1}, {x:3, y:3}]; // Potential locations near start
        for (const cell of fallbackCells) {
             if (placedCount >= numKeysNeeded) break;
             if (cell.x < actualMazeWidth -1 && cell.y < actualMazeHeight - 1 && maze[cell.y][cell.x] === 0) {
                 const potentialPos = new THREE.Vector3(cell.x * cellSize, playerHeight / 2, cell.y * cellSize);
                 // Check if occupied
                 let occupied = keys.some(k => Math.round(k.position.x / cellSize) === cell.x && Math.round(k.position.z / cellSize) === cell.y) ||
                                collectibles.some(c => Math.round(c.position.x / cellSize) === cell.x && Math.round(c.position.z / cellSize) === cell.y);

                 if (!occupied) {
                    const key = new THREE.Mesh(keyGeometry, keyMaterial);
                    key.position.copy(potentialPos);
                    key.rotation.x = Math.PI / 2;
                    key.userData.isKey = true;
                    scene.add(key);
                    keys.push(key);
                    placedCount++;
                    console.log(`Placed key #${placedCount} using ULTIMATE fallback at (${cell.x}, ${cell.y})`);
                 }
             }
        }
    }

    console.log(`Placed ${keys.length} keys in total.`);
}

// --- Update Story Display ---
function updateStoryDisplay() {
    storyDisplayElement.innerHTML = "<b>História Coletada:</b><br>" + collectedStory.replace(/\n/g, '<br>');
    storyDisplayElement.scrollTop = storyDisplayElement.scrollHeight; // Scroll to bottom
}

// --- Update Key Display ---
function updateKeyDisplay() {
    keyDisplayElement.textContent = `Chaves: ${keysCollected} / ${numKeysNeeded}`;
    // Change exit marker color based on keys collected
    if (exitMarker) {
        exitMarker.material = (keysCollected >= numKeysNeeded) ? exitUnlockedMaterial : exitLockedMaterial;
    }
}

// --- Set Start Position ---
function setStartPosition() {
    const startX = 1 * cellSize;
    const startZ = 1 * cellSize;
    controls.getObject().position.set(startX, playerHeight, startZ);
    lastPlayerPosition.copy(controls.getObject().position); // Reset last position on new maze
    distanceMovedSinceLastStep = 0; // Reset distance counter
    console.log(`Player start position set to (${startX}, ${startZ})`);
}

// --- Timer Functions (unchanged) ---
function startTimer() {
    if (timerInterval || gameWon) return;
    startTime = Date.now();
    timerElement.textContent = 'Tempo: 0s';
    timerInterval = setInterval(updateTimer, 1000);
}
function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
}
function updateTimer() {
    if (gameWon) return;
    const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
    timerElement.textContent = `Tempo: ${elapsedTime}s`;
}

// --- Collision Detection (Walls - Sound Removed) ---
function checkCollision(moveDirection, moveDistance) {
    const playerPos = controls.getObject().position;
    const rayOrigin = new THREE.Vector3(playerPos.x, playerHeight * 0.5, playerPos.z);
    raycaster.set(rayOrigin, moveDirection);
    const intersects = raycaster.intersectObjects(walls, false);

    if (intersects.length > 0 && intersects[0].distance < (moveDistance + collisionDistance)) {
        // Collision sound removed as requested
        // if (collisionSound && !collisionSound.isPlaying) {
        //     collisionSound.play();
        // }
        return true;
    }
    return false;
}

// --- Check Collectible Collision (Corrected) ---
function checkCollectibleCollision(playerPos) {
    for (let i = collectibles.length - 1; i >= 0; i--) {
        const collectible = collectibles[i];
        // Check distance in XZ plane for simpler collision
        const distanceXZ = Math.sqrt(Math.pow(playerPos.x - collectible.position.x, 2) + Math.pow(playerPos.z - collectible.position.z, 2));

        if (distanceXZ < playerRadius + collectibleRadius + 0.1) { // Increased detection radius slightly
            // Collect item
            collectedStory += collectible.userData.story + "\n";
            updateStoryDisplay();
            scene.remove(collectible);
            collectibles.splice(i, 1);
            console.log("Collected item:", collectible.userData.story);
            if (collectSound && !collectSound.isPlaying) {
                // Ensure sound is loaded before playing
                if (collectSound.buffer) {
                    collectSound.play();
                } else {
                    console.warn("Collect sound buffer not loaded yet.");
                }
            }
            break; // Only collect one item per frame
        }
    }
}

// --- Check Key Collision (Corrected) ---
function checkKeyCollision(playerPos) {
    for (let i = keys.length - 1; i >= 0; i--) {
        const key = keys[i];
        // Check distance in XZ plane for simpler collision
        const distanceXZ = Math.sqrt(Math.pow(playerPos.x - key.position.x, 2) + Math.pow(playerPos.z - key.position.z, 2));

        if (distanceXZ < playerRadius + keyRadius) {
            // Collect key
            keysCollected++;
            updateKeyDisplay();
            scene.remove(key);
            keys.splice(i, 1);
            console.log("Collected key! Total:", keysCollected);
            if (keyCollectSound && !keyCollectSound.isPlaying) {
                 // Ensure sound is loaded before playing
                if (keyCollectSound.buffer) {
                    keyCollectSound.play();
                } else {
                    console.warn("Key collect sound buffer not loaded yet.");
                }
            }
            break; // Only collect one key per frame
        }
    }
}

// --- Win Condition (Modified for Keys) ---
function checkWinCondition(playerPos) {
    if (gameWon) return;
    // Check if player has all keys BEFORE checking exit distance
    if (keysCollected < numKeysNeeded) return;

    const distanceXZ = Math.sqrt(Math.pow(playerPos.x - exitPosition.x, 2) + Math.pow(playerPos.z - exitPosition.z, 2));
    if (distanceXZ < cellSize / 1.5) {
        gameWon = true;
        stopTimer();
        controls.unlock();
        const finalTime = timerElement.textContent;

        if (victorySound) {
            victorySound.play();
        }

        currentMazeSize += 2;

        const winMessageDiv = document.createElement('div');
        winMessageDiv.id = 'win-message';
        winMessageDiv.style.position = 'absolute';
        winMessageDiv.style.top = '50%';
        winMessageDiv.style.left = '50%';
        winMessageDiv.style.transform = 'translate(-50%, -50%)';
        winMessageDiv.style.padding = '20px';
        winMessageDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        winMessageDiv.style.color = 'white';
        winMessageDiv.style.fontSize = '24px';
        winMessageDiv.style.textAlign = 'center';
        winMessageDiv.style.border = '2px solid lime';
        winMessageDiv.style.borderRadius = '10px';
        winMessageDiv.style.zIndex = '1000';
        winMessageDiv.innerHTML = `Você escapou!<br>${finalTime}<br>Próximo nível: Labirinto ${currentMazeSize}x${currentMazeSize}<br>(Clique para continuar)`;
        document.body.appendChild(winMessageDiv);

        winMessageDiv.addEventListener('click', () => {
            generateAndBuildMaze(currentMazeSize);
            // Apply the current theme's visuals AFTER the new maze is built
            const theme = textures[currentTheme];
            wallMaterial.map = theme.wall;
            floorMaterial.map = theme.floor;
            if (ceiling) {
                ceilingMaterial.map = theme.ceiling;
                ceiling.visible = !!theme.ceiling;
            }
            scene.background = new THREE.Color(theme.skyColor);
            scene.fog.color.setHex(theme.fogColor);
            wallMaterial.needsUpdate = true;
            floorMaterial.needsUpdate = true;
            if (ceiling) ceilingMaterial.needsUpdate = true;
        }, { once: true });

        timerElement.textContent = `Vitória! ${finalTime}`;
        console.log("Game Won! Next size:", currentMazeSize);
    }
}

    // --- Animation Loop (Modified for Touch) ---
function animate() {
    requestAnimationFrame(animate);
    const time = performance.now();
    const delta = Math.min(0.1, (time - prevTime) / 1000);
    prevTime = time;

    // Determine movement flags based on input type
    let currentMoveForward = touchControlsEnabled ? touchMoveForward : moveForward;
    let currentMoveBackward = touchControlsEnabled ? touchMoveBackward : moveBackward;
    let currentMoveLeft = touchControlsEnabled ? touchMoveLeft : moveLeft;
    let currentMoveRight = touchControlsEnabled ? touchMoveRight : moveRight;

    const playerIsMoving = currentMoveForward || currentMoveBackward || currentMoveLeft || currentMoveRight;

    // Handle Look (Touch)
    if (touchControlsEnabled && !gameWon) {
        // Apply touch look rotation
        const euler = new THREE.Euler(0, 0, 0, 'YXZ');
        euler.setFromQuaternion(camera.quaternion);

        euler.y -= lookDelta.x * lookSensitivity;
        euler.x -= lookDelta.y * lookSensitivity;

        // Clamp vertical look
        euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x));

        camera.quaternion.setFromEuler(euler);

        // Reset lookDelta after applying it
        lookDelta.x = 0;
        lookDelta.y = 0;
    }

    // Handle Movement (Desktop PointerLock or Touch)
    if ((controls.isLocked === true || touchControlsEnabled) && !gameWon) {
        const playerPosition = controls.getObject().position; // Use controls object position for both
        const effectiveSpeed = playerSpeed * delta;
        const forwardVector = new THREE.Vector3();
        camera.getWorldDirection(forwardVector); // Use camera direction for movement
        forwardVector.y = 0;
        forwardVector.normalize();
        const rightVector = new THREE.Vector3();
        rightVector.crossVectors(camera.up, forwardVector).normalize();

        // Store position before movement
        const positionBeforeMove = playerPosition.clone();

        // Movement and Wall Collision
        if (currentMoveForward) {
            if (!checkCollision(forwardVector, effectiveSpeed)) {
                 playerPosition.addScaledVector(forwardVector, effectiveSpeed);
            }
        }
        if (currentMoveBackward) {
            if (!checkCollision(forwardVector.clone().negate(), effectiveSpeed)) {
                playerPosition.addScaledVector(forwardVector, -effectiveSpeed);
            }
        }
        if (currentMoveLeft) {
            const leftVector = rightVector.clone().negate();
            if (!checkCollision(leftVector, effectiveSpeed)) {
                playerPosition.addScaledVector(rightVector, -effectiveSpeed);
            }
        }
        if (currentMoveRight) {
            if (!checkCollision(rightVector, effectiveSpeed)) {
                playerPosition.addScaledVector(rightVector, effectiveSpeed);
            }
        }

        // Calculate distance moved this frame (XZ plane)
        const distanceThisFrame = positionBeforeMove.distanceTo(playerPosition);
        distanceMovedSinceLastStep += distanceThisFrame;

        // Play footstep sound based on distance threshold
        if (distanceMovedSinceLastStep >= footstepDistanceThreshold && footstepSound && playerIsMoving) { // Only play if moving
            if (!footstepSound.isPlaying) {
                if (footstepSound.buffer) {
                    footstepSound.play();
                } else {
                    console.warn("Footstep sound buffer not loaded yet.");
                }
            }
            distanceMovedSinceLastStep = 0; // Reset counter
        } else if (!playerIsMoving) {
             distanceMovedSinceLastStep = 0; // Reset if stopped
        }

        // Clamp position (Boundary check)
        const mazePixelWidth = actualMazeWidth * cellSize;
        const mazePixelHeight = actualMazeHeight * cellSize;
        playerPosition.x = Math.max(wallThickness / 2 + playerRadius, Math.min(mazePixelWidth - cellSize + wallThickness / 2 - playerRadius, playerPosition.x));
        playerPosition.z = Math.max(wallThickness / 2 + playerRadius, Math.min(mazePixelHeight - cellSize + wallThickness / 2 - playerRadius, playerPosition.z));
        playerPosition.y = playerHeight;

        // Check for collectible collision
        checkCollectibleCollision(playerPosition);

        // Check for key collision
        checkKeyCollision(playerPosition);

        // Check win condition (only if keys are collected)
        checkWinCondition(playerPosition);
    }

    // Animate keys (simple rotation)
    const rotationSpeed = delta * 2;
    keys.forEach(key => {
        key.rotation.z += rotationSpeed;
    });

    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Control Mode Selection Logic (Wait for DOM) ---
document.addEventListener("DOMContentLoaded", () => {
    const desktopButton = document.getElementById("control-desktop");
    const mobileButton = document.getElementById("control-mobile");

    if (desktopButton) {
        desktopButton.addEventListener("click", () => startGame("desktop"));
    } else {
        console.error("Desktop control button not found!");
    }

    if (mobileButton) {
        mobileButton.addEventListener("click", () => startGame("mobile"));
    } else {
        console.error("Mobile control button not found!");
    }
});

function startGame(mode) {
    controlMode = mode;
    isMobile = (mode === "mobile");
    console.log(`Starting game in ${controlMode} mode. isMobile: ${isMobile}`);

    // Hide selector
    const selector = document.getElementById("control-mode-selector");
    if (selector) selector.style.display = "none";

    // Initialize the game
    initGameAfterModeSelection();
}

// --- Main Initialization (Called after mode selection) ---
function initGameAfterModeSelection() {
    // Scene
    scene = new THREE.Scene();
    // Adjust fog based on device type (closer fog for mobile)
    const fogDistance = isMobile ? 4 * cellSize : 8 * cellSize;
    scene.fog = new THREE.Fog(0x000000, 0, fogDistance);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.y = playerHeight;

    // Audio Setup
    listener = new THREE.AudioListener();
    camera.add(listener);
    audioLoader = new THREE.AudioLoader();

    // Load Sounds
    audioLoader.load('sounds/footsteps.mp3', function(buffer) {
        footstepSound = new THREE.Audio(listener);
        footstepSound.setBuffer(buffer);
        footstepSound.setLoop(false);
        footstepSound.setVolume(0.4);
    });
    audioLoader.load('sounds/victory.mp3', function(buffer) {
        victorySound = new THREE.Audio(listener);
        victorySound.setBuffer(buffer);
        victorySound.setLoop(false);
        victorySound.setVolume(0.7);
    });
    audioLoader.load('sounds/collect.mp3', function(buffer) { // Story collect sound
        collectSound = new THREE.Audio(listener);
        collectSound.setBuffer(buffer);
        collectSound.setLoop(false);
        collectSound.setVolume(0.5);
    }, undefined, function (err) {
        console.warn('Could not load collect sound effect.');
    });
    audioLoader.load('sounds/key_collect.mp3', function(buffer) { // Key collect sound
        keyCollectSound = new THREE.Audio(listener);
        keyCollectSound.setBuffer(buffer);
        keyCollectSound.setLoop(false);
        keyCollectSound.setVolume(0.6);
    }, undefined, function (err) {
        console.warn('Could not load key collect sound effect.');
    });

    // Flashlight Setup
    flashlight = new THREE.SpotLight(0xffffff, 1.5, 15 * cellSize, Math.PI / 6, 0.3, 1.5);
    flashlight.castShadow = false;
    flashlightTarget = new THREE.Object3D();
    flashlight.target = flashlightTarget;
    camera.add(flashlight);
    camera.add(flashlightTarget);
    flashlight.position.set(0, 0, 0.1);
    flashlightTarget.position.set(0, 0, -1);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Adjust pixel ratio for performance on mobile
    const pixelRatio = isMobile ? Math.min(window.devicePixelRatio, 1.5) : window.devicePixelRatio;
    renderer.setPixelRatio(pixelRatio);
    document.getElementById('container').appendChild(renderer.domElement);

    // Controls (Setup based on mode)
    if (controlMode === "desktop") {
        controls = new PointerLockControls(camera, renderer.domElement);
        scene.add(controls.getObject());
        lastPlayerPosition.copy(controls.getObject().position); // Initialize last position

        // Desktop-specific listeners
        document.addEventListener('click', () => {
            if (!gameWon) controls.lock();
        });
        controls.addEventListener('lock', () => {
            console.log('Pointer Locked');
            if (!gameWon) startTimer();
        });
        controls.addEventListener('unlock', () => {
            console.log('Pointer Unlocked');
            stopTimer();
        });
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);
    } else { // Mobile mode
        // Use camera directly for position, PointerLockControls not used
        controls = { getObject: () => camera }; // Mock controls object for position access
        lastPlayerPosition.copy(camera.position);
        setupTouchControls(); // Setup touch controls only in mobile mode
    }

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x606060, 0.8);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 0.5, 25 * cellSize);
    scene.add(pointLight);

    // Generate Maze FIRST
    generateAndBuildMaze(currentMazeSize);

    // Set initial theme (without regenerating maze)
    const initialTheme = textures[currentTheme];
    wallMaterial.map = initialTheme.wall;
    floorMaterial.map = initialTheme.floor;
    if (ceiling) {
        ceilingMaterial.map = initialTheme.ceiling;
        ceiling.visible = !!initialTheme.ceiling;
    }
    scene.background = new THREE.Color(initialTheme.skyColor);
    scene.fog.color.setHex(initialTheme.fogColor);
    wallMaterial.needsUpdate = true;
    floorMaterial.needsUpdate = true;
    if (ceiling) ceilingMaterial.needsUpdate = true;

    // Theme Buttons - Now call setTheme which regenerates the maze
    document.getElementById('theme-brick').addEventListener('click', () => setTheme('brick'));
    document.getElementById('theme-garden').addEventListener('click', () => setTheme('garden'));
    document.getElementById('theme-metal').addEventListener('click', () => setTheme('metal'));

    // Start animation
    animate();
}

// Removed automatic init() call from the end
// init();
// setupTouchControls(); // Moved inside init based on mode

