const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const instructionsDisplay = document.getElementById('instructions');
const gameOverDisplay = document.getElementById('gameOver');

// --- Image Loading ---
let imagesLoaded = 0;
const totalImages = 3; // Adjust if you add obstacle sprites later
let allImagesLoaded = false;

function imageLoaded() {
    imagesLoaded++;
    console.log(`Loaded image ${imagesLoaded}/${totalImages}`);
    if (imagesLoaded === totalImages) {
        allImagesLoaded = true;
        console.log("All sprites loaded!");
        // Draw initial state correctly now that images are ready
        drawInitialState();
        instructionsDisplay.textContent = "Press SPACE to Start / Jump"; // Ensure correct message
    }
}

const playerRunSprite = new Image();
playerRunSprite.onload = imageLoaded;
// --- !!! REPLACE WITH YOUR FILE PATH !!! ---
playerRunSprite.src = 'main-sprite.png'; // e.g., 'images/dino-run.png'

const playerJumpSprite = new Image();
playerJumpSprite.onload = imageLoaded;
// --- !!! REPLACE WITH YOUR FILE PATH !!! ---
playerJumpSprite.src = 'jumping-sprite.png'; // e.g., 'images/dino-jump.png'

// Placeholder for obstacle sprite loading (if you add them later)
const boxSprite = new Image();
boxSprite.onload = imageLoaded;
boxSprite.src = 'box.png';
const boxWidth = 68;
const boxHeight = 70;


const bikeSprite = new Image();
bikeSprite.onload = imageLoaded;
bikeSprite.src = 'bike.png';
const bikeWidth = 97;
const bikeHeight = 61;

const spikeSprite = new Image();
spikeSprite.onload = imageLoaded;
spikeSprite.src = 'spike.png';
const spikeWidth = 114;
const spikeHeight = 33;

const cactusSprite = new Image();
cactusSprite.onload = imageLoaded;
cactusSprite.src = 'cactus.png';
const cactusWidth = 60;
const cactusHeight = 69;

// totalImages = 3; // <-- Remember to update totalImages

// --- Game Constants ---
const PLAYER_RUN_WIDTH = 78;
const PLAYER_RUN_HEIGHT = 121;
const PLAYER_JUMP_WIDTH = 74;
const PLAYER_JUMP_HEIGHT = 162;

// Adjust GROUND_Y based on the height of the sprite when *on the ground*
const GROUND_Y = canvas.height - PLAYER_RUN_HEIGHT - 10; // Use running height
const GRAVITY = 0.6;
const JUMP_STRENGTH = -20; // May need tweaking based on sprite height/feel

// Obstacle constants remain the same for now
const OBSTACLE_MIN_WIDTH = 68;
const OBSTACLE_MAX_WIDTH = 136;
const OBSTACLE_MIN_HEIGHT = 70;
const OBSTACLE_MAX_HEIGHT = 140;
const OBSTACLE_COLOR = '#555'; // Placeholder color

// --- Game Variables ---
let playerY = GROUND_Y;
let playerVelocityY = 0;
let isJumping = false;
let obstacles = [];
let score = 0;
let gameSpeed = 5;
let frameCount = 0;
let obstacleSpawnTimer = 0;
let minSpawnInterval = 90; // Adjusted slightly for potentially larger player
let maxSpawnInterval = 150; // Adjusted slightly
let isGameOver = false;
let gameStarted = false;
let animationFrameId = null;

// --- Player Object ---
const player = {
    x: 50,
    // Store current dimensions for collision and drawing
    currentWidth: PLAYER_RUN_WIDTH,
    currentHeight: PLAYER_RUN_HEIGHT,
    // Assign loaded image objects
    runSprite: playerRunSprite,
    jumpSprite: playerJumpSprite,

    draw: function() {
        let spriteToDraw;
        // Determine which sprite and dimensions to use
        if (isJumping) {
            spriteToDraw = this.jumpSprite;
            this.currentWidth = PLAYER_JUMP_WIDTH;
            this.currentHeight = PLAYER_JUMP_HEIGHT;
        } else {
            spriteToDraw = this.runSprite;
            this.currentWidth = PLAYER_RUN_WIDTH;
            this.currentHeight = PLAYER_RUN_HEIGHT;
        }

        // Check if the specific sprite is loaded before drawing
        if (spriteToDraw.complete && spriteToDraw.naturalHeight !== 0) {
            ctx.drawImage(spriteToDraw, this.x, playerY, this.currentWidth, this.currentHeight);
        } else {
            // Fallback rectangle if image isn't ready (useful during loading)
            // You might see this briefly if the game tries to draw before loading finishes
             ctx.fillStyle = '#FF0000'; // Red fallback
             ctx.fillRect(this.x, playerY, this.currentWidth, this.currentHeight);
             console.warn("Player sprite not ready, drawing fallback rect.");
        }
    },

    update: function() {
        // Apply gravity
        playerVelocityY += GRAVITY;
        playerY += playerVelocityY;

        // Ground check - use GROUND_Y calculated with running height
        if (playerY >= GROUND_Y) {
            playerY = GROUND_Y;
            playerVelocityY = 0;
            if (isJumping) { // Only change state if we were actually jumping
                 isJumping = false;
                 // Important: Reset dimensions back to running state upon landing
                 this.currentWidth = PLAYER_RUN_WIDTH;
                 this.currentHeight = PLAYER_RUN_HEIGHT;
            }
        }
        // Note: Dimensions are set in draw() just before rendering,
        // or could be set here based on the isJumping state before collision checks.
        // Let's keep it simple and update them in draw for now.
        // If collision seems off, we might need to update dimensions here too.
    },

    jump: function() {
        // Allow jump only when on the ground (or very close to it)
        if (!isJumping && !isGameOver && playerY >= GROUND_Y - 5) { // Small tolerance
            playerVelocityY = JUMP_STRENGTH;
            isJumping = true;
            // Dimensions will be updated in the next draw call
        }
    }
};

// --- Obstacle Functions ---
function spawnObstacle() {
    // Create an array of sprite objects with their respective properties
    const spriteOptions = [
        { sprite: boxSprite, width: boxWidth, height: boxHeight },
        { sprite: bikeSprite, width: bikeWidth, height: bikeHeight },
        { sprite: spikeSprite, width: spikeWidth, height: spikeHeight },
        { sprite: cactusSprite, width: cactusWidth, height: cactusHeight }
    ];
    
    // Select a random sprite from the options
    const randomIndex = Math.floor(Math.random() * spriteOptions.length);
    const selectedSprite = spriteOptions[randomIndex];
    
    const obstacle = {
        x: canvas.width,
        y: canvas.height - selectedSprite.height - 10, // Positioned on the ground line
        width: selectedSprite.width,
        height: selectedSprite.height,
        spriteRef: selectedSprite.sprite, // Store reference to the sprite image
        draw: function() {
            // Draw the sprite with its own dimensions
            ctx.drawImage(this.spriteRef, this.x, this.y, this.width, this.height);
        },
        update: function() {
            this.x -= gameSpeed;
        }
    };
    
    obstacles.push(obstacle);
}

function updateObstacles() {
    // Spawn new obstacles periodically
    obstacleSpawnTimer--;
    if (obstacleSpawnTimer <= 0) {
        spawnObstacle();
        obstacleSpawnTimer = Math.floor(Math.random() * (maxSpawnInterval - minSpawnInterval + 1)) + minSpawnInterval;
    }

    // Move and draw existing obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].update();
        obstacles[i].draw(); // Draw obstacles first

        // Remove obstacles that have gone off-screen
        if (obstacles[i].x + obstacles[i].width < 0) {
            obstacles.splice(i, 1);
        }
    }
}

// --- Collision Detection ---
function detectCollision() {
    for (const obstacle of obstacles) {
        // Use the player's *current* width and height for accurate collision
        if (
            player.x < obstacle.x + obstacle.width &&
            player.x + player.currentWidth > obstacle.x &&   // Use currentWidth
            playerY < obstacle.y + obstacle.height &&
            playerY + player.currentHeight > obstacle.y    // Use currentHeight
        ) {
            // Collision detected!
            isGameOver = true;
            gameStarted = false;
            instructionsDisplay.style.display = 'none';
            gameOverDisplay.style.display = 'block';
            cancelAnimationFrame(animationFrameId);
            console.log("Game Over! Final Score:", score);
            return; // Exit loop once collision is found
        }
    }
}

// --- Game Loop ---
function gameLoop() {
    if (!gameStarted || !allImagesLoaded) { // Ensure images are loaded before running game logic
        // If images aren't loaded yet, maybe show a loading indicator
        // We could request the next frame anyway to keep trying, or wait
        // For now, just stop if not ready. Start logic handles the initial call.
        return;
    }

    animationFrameId = requestAnimationFrame(gameLoop);

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update and Draw Obstacles first (so player draws on top)
    updateObstacles();

    // Update and Draw Player
    player.update();
    player.draw(); // This now uses the correct sprite and dimensions

    // Check for Collisions
    if (!isGameOver) { // Only check collision if game is running
       detectCollision();
    }

    // Update Score (only if game is running)
    if (!isGameOver) {
        frameCount++;
        if (frameCount % 10 === 0) {
            score++;
            scoreDisplay.textContent = `Score: ${score}`;

            // Increase difficulty slightly over time
            if (score > 0 && score % 100 === 0) {
                gameSpeed += 0.5;
                console.log("Speed increased to:", gameSpeed);
                 minSpawnInterval = Math.max(40, minSpawnInterval * 0.98); // Decrease slightly faster
                 maxSpawnInterval = Math.max(70, maxSpawnInterval * 0.98);
            }
        }
    }
}

// --- Game Initialization and Reset ---
function resetGame() {
    playerY = GROUND_Y;
    playerVelocityY = 0;
    isJumping = false;
    player.currentWidth = PLAYER_RUN_WIDTH; // Reset dimensions
    player.currentHeight = PLAYER_RUN_HEIGHT;
    obstacles = [];
    score = 0;
    gameSpeed = 5;
    frameCount = 0;
    obstacleSpawnTimer = maxSpawnInterval;
    minSpawnInterval = 90; // Reset intervals
    maxSpawnInterval = 150;
    isGameOver = false;
    gameStarted = true; // Set game as started

    scoreDisplay.textContent = `Score: ${score}`;
    gameOverDisplay.style.display = 'none';
    instructionsDisplay.style.display = 'none';

    // Clear any previous loop and start the new one
    cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(gameLoop); // Start the loop immediately
}

function tryStartGame() {
    // Only start/restart if images are loaded
    if (!allImagesLoaded) {
        console.log("Waiting for images...");
        instructionsDisplay.textContent = "Loading Sprites..."; // Update UI
        return; // Don't start yet
    }

    if (!gameStarted || isGameOver) {
        resetGame(); // Resets variables and starts the game loop
    }
}

// --- Event Listener ---
document.addEventListener('keydown', function(event) {
    if (event.code === 'Space') {
        event.preventDefault();
        if (!gameStarted || isGameOver) {
            tryStartGame(); // Attempt to start or restart
        } else if (gameStarted && !isGameOver) {
            player.jump(); // Jump if game is already running
        }
    }
});

// --- Initial State Drawing Function ---
function drawInitialState() {
     ctx.clearRect(0, 0, canvas.width, canvas.height);
     // Draw ground line
     ctx.beginPath();
     ctx.moveTo(0, canvas.height - 10);
     ctx.lineTo(canvas.width, canvas.height - 10);
     ctx.stroke();

     // Draw initial player state (running sprite on ground)
     // Check if the specific running sprite is ready
     if (player.runSprite.complete && player.runSprite.naturalHeight !== 0) {
        ctx.drawImage(player.runSprite, player.x, GROUND_Y, PLAYER_RUN_WIDTH, PLAYER_RUN_HEIGHT);
     } else {
        // Fallback if image not ready yet when this is first called
        ctx.fillStyle = PLAYER_COLOR; // Use original placeholder color
        ctx.fillRect(player.x, GROUND_Y, PLAYER_RUN_WIDTH, PLAYER_RUN_HEIGHT);
        console.log("DrawInitialState: Run sprite not ready yet.");
     }
     scoreDisplay.textContent = `Score: 0`;
     instructionsDisplay.style.display = 'block';
     instructionsDisplay.textContent = "Loading Sprites..."; // Initial message
     gameOverDisplay.style.display = 'none';
}

// --- Start ---
// Call the initial drawing function once.
// The imageLoaded callback will call it again when images are ready.
// The event listener will handle the actual game start.
drawInitialState();