// Socket.IO connection
const socket = io();

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Confetti canvas
const confettiCanvas = document.getElementById('confetti-canvas');
confettiCanvas.width = window.innerWidth;
confettiCanvas.height = window.innerHeight;
const confettiCtx = confettiCanvas.getContext('2d');

// Game constants
const GRAVITY = 0.6;
const JUMP_FORCE = -12;
const MOVE_SPEED = 4; // Reduced from 5 for smoother movement
const GROUND_HEIGHT = 620; // Adjusted for 16:9 (720px height)

// 8-BIT SOUND EFFECTS using Web Audio API
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let musicPlaying = false;

function playSound(type) {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  switch(type) {
    case 'jump':
      oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
      break;

    case 'correct':
      [523, 659, 784, 1047].forEach((freq, i) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.2, audioContext.currentTime + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + i * 0.1 + 0.2);
        osc.start(audioContext.currentTime + i * 0.1);
        osc.stop(audioContext.currentTime + i * 0.1 + 0.2);
      });
      break;

    case 'wrong':
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.3);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
      break;

    case 'coin':
      oscillator.frequency.setValueAtTime(988, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1319, audioContext.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
      break;
  }
}

// Background music loop
function playBackgroundMusic() {
  if (musicPlaying) return;
  musicPlaying = true;

  const notes = [
    {freq: 523, duration: 0.2}, // C
    {freq: 659, duration: 0.2}, // E
    {freq: 784, duration: 0.2}, // G
    {freq: 659, duration: 0.2}, // E
    {freq: 698, duration: 0.2}, // F
    {freq: 784, duration: 0.2}, // G
    {freq: 880, duration: 0.4}, // A
    {freq: 784, duration: 0.2}, // G
  ];

  let time = 0;

  function playLoop() {
    notes.forEach((note, i) => {
      setTimeout(() => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.value = note.freq;
        osc.type = 'square';
        gain.gain.setValueAtTime(0.05, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + note.duration);
        osc.start(audioContext.currentTime);
        osc.stop(audioContext.currentTime + note.duration);
      }, time);
      time += note.duration * 1000;
    });

    setTimeout(playLoop, time);
    time = 0;
  }

  playLoop();
}

// Game state
let gameRunning = false;
let currentLevel = 0;
let waitingForAnswer = false;
let gameWon = false;
let playerLives = 3; // Health system - 3 hearts

// Questions for each level with explanations
const questions = [
  {
    question: "What is the capital of Saudi Arabia?",
    options: ["Riyadh", "Jeddah"],
    correct: "Riyadh",
    explanation: "Riyadh is the capital and largest city of Saudi Arabia, located in the center of the Arabian Peninsula. It serves as the political and administrative hub of the country. The city has grown from a small desert town to a modern metropolis and is home to over 7 million people."
  },
  {
    question: "How many pillars are in Islam?",
    options: ["5", "7"],
    correct: "5",
    explanation: "The Five Pillars of Islam are the foundation of Muslim life: Shahada (faith), Salah (prayer), Zakat (charity), Sawm (fasting during Ramadan), and Hajj (pilgrimage to Mecca). These five practices are considered mandatory for all Muslims and form the core of Islamic practice."
  },
  {
    question: "What year was Saudi Arabia founded?",
    options: ["1932", "1945"],
    correct: "1932",
    explanation: "The Kingdom of Saudi Arabia was officially founded on September 23, 1932, by King Abdulaziz Al Saud. He unified the various regions of the Arabian Peninsula after a 30-year campaign. This date is now celebrated as Saudi National Day every year."
  },
  {
    question: "What is the tallest building in Saudi Arabia?",
    options: ["Abraj Al Bait", "Kingdom Centre"],
    correct: "Abraj Al Bait",
    explanation: "Abraj Al Bait Clock Tower in Mecca stands at 601 meters (1,972 feet) tall, making it the tallest building in Saudi Arabia and one of the tallest in the world. It features the world's largest clock face and is located next to the Masjid al-Haram, the holiest site in Islam."
  },
  {
    question: "What sea is to the west of Saudi Arabia?",
    options: ["Red Sea", "Arabian Sea"],
    correct: "Red Sea",
    explanation: "The Red Sea borders Saudi Arabia's western coast, separating the Arabian Peninsula from Africa. It is approximately 2,250 km long and is known for its rich marine biodiversity and coral reefs. The Red Sea has been an important trade route throughout history."
  }
];

// Player object
const player = {
  x: 100,
  y: GROUND_HEIGHT - 64,
  width: 48,
  height: 64,
  velocityY: 0,
  isJumping: false,
  direction: 1, // 1 for right, -1 for left
  animationFrame: 0,
  animationCounter: 0
};

// Obstacles array
let obstacles = [];

// Background parallax
let backgroundX = 0;
let cloudX = 0;
let palmX = 0;
let starOffset = 0;
let coins = [];

// Input handling
const keys = {};

window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'Space' && !player.isJumping && gameRunning) {
    player.velocityY = JUMP_FORCE;
    player.isJumping = true;
    playSound('jump');
  }
});

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

// Draw Arab office worker character
function drawPlayer() {
  const x = player.x;
  const y = player.y;
  const scale = 4;

  // Animation
  player.animationCounter++;
  if (player.animationCounter > 8) {
    player.animationFrame = (player.animationFrame + 1) % 2;
    player.animationCounter = 0;
  }

  ctx.save();
  if (player.direction === -1) {
    ctx.scale(-1, 1);
    ctx.translate(-x * 2 - player.width, 0);
  }

  // BLACK HAIR - styled
  ctx.fillStyle = '#1A1A1A';
  ctx.fillRect(x + 14 * scale, y + 2 * scale, 8 * scale, 6 * scale);
  // Hair highlights
  ctx.fillStyle = '#2A2A2A';
  ctx.fillRect(x + 15 * scale, y + 3 * scale, 2 * scale, 3 * scale);
  ctx.fillRect(x + 19 * scale, y + 3 * scale, 2 * scale, 3 * scale);

  // FACE (tan skin tone) - more prominent
  ctx.fillStyle = '#C49563';
  ctx.fillRect(x + 14 * scale, y + 8 * scale, 8 * scale, 6 * scale);

  // Face highlights for depth
  ctx.fillStyle = '#D4A574';
  ctx.fillRect(x + 15 * scale, y + 9 * scale, 6 * scale, 4 * scale);

  // EYES - more detailed and expressive
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(x + 15 * scale, y + 10 * scale, 2 * scale, 2 * scale);
  ctx.fillRect(x + 19 * scale, y + 10 * scale, 2 * scale, 2 * scale);

  // Pupils
  ctx.fillStyle = '#000000';
  ctx.fillRect(x + 16 * scale, y + 10 * scale, 1 * scale, 2 * scale);
  ctx.fillRect(x + 20 * scale, y + 10 * scale, 1 * scale, 2 * scale);

  // Eye shine
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(x + 16 * scale, y + 10 * scale, 1 * scale, 1 * scale);
  ctx.fillRect(x + 20 * scale, y + 10 * scale, 1 * scale, 1 * scale);

  // EYEBROWS - dark and defined
  ctx.fillStyle = '#1A1A1A';
  ctx.fillRect(x + 15 * scale, y + 9 * scale, 2 * scale, 1 * scale);
  ctx.fillRect(x + 19 * scale, y + 9 * scale, 2 * scale, 1 * scale);

  // NOSE - more defined
  ctx.fillStyle = '#B8956B';
  ctx.fillRect(x + 17 * scale, y + 11 * scale, 2 * scale, 2 * scale);

  // MUSTACHE - prominent facial hair
  ctx.fillStyle = '#1A1A1A';
  ctx.fillRect(x + 15 * scale, y + 13 * scale, 6 * scale, 1 * scale);
  ctx.fillRect(x + 14 * scale, y + 14 * scale, 8 * scale, 1 * scale);

  // NECK
  ctx.fillStyle = '#C49563';
  ctx.fillRect(x + 16 * scale, y + 14 * scale, 4 * scale, 2 * scale);

  // WHITE THOB (traditional dress) - pure white, no yellow
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(x + 13 * scale, y + 16 * scale, 10 * scale, 8 * scale);

  // Thob collar (more defined)
  ctx.fillStyle = '#F5F5F5';
  ctx.fillRect(x + 16 * scale, y + 16 * scale, 4 * scale, 2 * scale);

  // Thob shadows for depth
  ctx.fillStyle = '#ECECEC';
  ctx.fillRect(x + 14 * scale, y + 18 * scale, 2 * scale, 6 * scale);
  ctx.fillRect(x + 20 * scale, y + 18 * scale, 2 * scale, 6 * scale);

  // Thob center line/buttons
  ctx.fillStyle = '#E8E8E8';
  ctx.fillRect(x + 17 * scale, y + 17 * scale, 2 * scale, 6 * scale);

  // LEGS with walking animation (part of thob)
  ctx.fillStyle = '#FFFFFF';
  if (player.animationFrame === 0) {
    ctx.fillRect(x + 14 * scale, y + 24 * scale, 3 * scale, 6 * scale);
    ctx.fillRect(x + 19 * scale, y + 24 * scale, 3 * scale, 6 * scale);
  } else {
    ctx.fillRect(x + 14 * scale, y + 24 * scale, 3 * scale, 5 * scale);
    ctx.fillRect(x + 19 * scale, y + 24 * scale, 3 * scale, 7 * scale);
  }

  // SANDALS (brown)
  ctx.fillStyle = '#8B4513';
  if (player.animationFrame === 0) {
    ctx.fillRect(x + 14 * scale, y + 29 * scale, 3 * scale, 2 * scale);
    ctx.fillRect(x + 19 * scale, y + 29 * scale, 3 * scale, 2 * scale);
  } else {
    ctx.fillRect(x + 14 * scale, y + 28 * scale, 3 * scale, 2 * scale);
    ctx.fillRect(x + 19 * scale, y + 30 * scale, 3 * scale, 2 * scale);
  }

  ctx.restore();
}

// Draw ENHANCED office-themed background with more props
function drawBackground() {
  // CLEAN Sky - simple light blue
  ctx.fillStyle = '#B3D9E8';
  ctx.fillRect(0, 0, canvas.width, GROUND_HEIGHT);

  // Simple white clouds
  drawClouds();

  // OFFICE BUILDINGS - clean flat design
  const buildings = [
    { x: 50, width: 100, height: 280, color: '#6B7280' },
    { x: 200, width: 80, height: 350, color: '#4B5563' },
    { x: 320, width: 90, height: 250, color: '#5A6169' },
    { x: 480, width: 120, height: 400, color: '#3F4853' },
    { x: 650, width: 85, height: 300, color: '#545B66' },
    { x: 800, width: 95, height: 320, color: '#60696F' },
    { x: 950, width: 110, height: 380, color: '#464D56' },
    { x: 1120, width: 90, height: 290, color: '#515960' }
  ];

  buildings.forEach(building => {
    const x = (building.x - backgroundX * 0.3) % (canvas.width + 400);

    // Building body
    ctx.fillStyle = building.color;
    ctx.fillRect(x, GROUND_HEIGHT - building.height, building.width, building.height);

    // Office windows (yellow glow)
    ctx.fillStyle = '#FFE87C';
    const windowCols = Math.floor(building.width / 25);
    const windowRows = Math.floor(building.height / 30);

    for (let row = 1; row < windowRows; row++) {
      for (let col = 0; col < windowCols; col++) {
        const wx = x + 12 + col * 25;
        const wy = GROUND_HEIGHT - building.height + 10 + row * 30;
        ctx.fillRect(wx, wy, 15, 18);
      }
    }
  });

  // GROUND - clean brown tiles
  const groundGradient = ctx.createLinearGradient(0, GROUND_HEIGHT, 0, canvas.height);
  groundGradient.addColorStop(0, '#8B6F47');
  groundGradient.addColorStop(1, '#6B5436');
  ctx.fillStyle = groundGradient;
  ctx.fillRect(0, GROUND_HEIGHT, canvas.width, canvas.height - GROUND_HEIGHT);

  // Clean tile pattern
  ctx.strokeStyle = '#6B5436';
  ctx.lineWidth = 2;
  for (let i = 0; i < canvas.width; i += 40) {
    ctx.beginPath();
    ctx.moveTo(i, GROUND_HEIGHT);
    ctx.lineTo(i, canvas.height);
    ctx.stroke();
  }
  for (let j = GROUND_HEIGHT; j < canvas.height; j += 40) {
    ctx.beginPath();
    ctx.moveTo(0, j);
    ctx.lineTo(canvas.width, j);
    ctx.stroke();
  }

  // OFFICE PROPS - desks, plants, etc.
  drawOfficeProps();

  // PALM TREES (Riyadh element - but cleaner)
  for (let i = 0; i < 6; i++) {
    const x = (i * 200 - palmX * 0.5) % (canvas.width + 300);
    drawCleanPalmTree(x, GROUND_HEIGHT);
  }
}

// Draw office props for visual diversity
function drawOfficeProps() {
  const props = [
    { type: 'desk', x: 150 },
    { type: 'plant', x: 280 },
    { type: 'water', x: 450 },
    { type: 'desk', x: 620 },
    { type: 'plant', x: 780 },
    { type: 'chair', x: 900 },
    { type: 'water', x: 1050 }
  ];

  props.forEach(prop => {
    const x = (prop.x - backgroundX * 0.6) % (canvas.width + 300);
    if (x < -100 || x > canvas.width + 50) return;

    switch(prop.type) {
      case 'desk':
        // Office desk
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(x, GROUND_HEIGHT - 60, 80, 10);
        ctx.fillRect(x + 5, GROUND_HEIGHT - 50, 5, 50);
        ctx.fillRect(x + 70, GROUND_HEIGHT - 50, 5, 50);
        // Computer on desk
        ctx.fillStyle = '#2C3E50';
        ctx.fillRect(x + 30, GROUND_HEIGHT - 75, 20, 15);
        ctx.fillStyle = '#3498DB';
        ctx.fillRect(x + 32, GROUND_HEIGHT - 73, 16, 11);
        break;

      case 'plant':
        // Potted plant
        ctx.fillStyle = '#C17C3F';
        ctx.fillRect(x + 15, GROUND_HEIGHT - 30, 20, 30);
        ctx.fillStyle = '#27AE60';
        ctx.beginPath();
        ctx.arc(x + 25, GROUND_HEIGHT - 40, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#229954';
        ctx.beginPath();
        ctx.arc(x + 20, GROUND_HEIGHT - 45, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 30, GROUND_HEIGHT - 45, 12, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'water':
        // Water cooler
        ctx.fillStyle = '#5DADE2';
        ctx.fillRect(x + 10, GROUND_HEIGHT - 80, 30, 50);
        ctx.fillStyle = '#3498DB';
        ctx.fillRect(x + 15, GROUND_HEIGHT - 75, 20, 20);
        ctx.fillStyle = '#2C3E50';
        ctx.fillRect(x + 15, GROUND_HEIGHT - 30, 20, 30);
        break;

      case 'chair':
        // Office chair
        ctx.fillStyle = '#34495E';
        ctx.fillRect(x + 10, GROUND_HEIGHT - 50, 30, 10);
        ctx.fillRect(x + 20, GROUND_HEIGHT - 70, 10, 20);
        ctx.fillRect(x + 15, GROUND_HEIGHT - 40, 5, 40);
        ctx.fillRect(x + 30, GROUND_HEIGHT - 40, 5, 40);
        break;
    }
  });
}

// Draw simple clouds
function drawClouds() {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';

  const clouds = [
    { x: 100, y: 80, size: 1 },
    { x: 400, y: 120, size: 0.8 },
    { x: 700, y: 100, size: 1.2 },
    { x: 1000, y: 90, size: 0.9 }
  ];

  clouds.forEach(cloud => {
    const x = (cloud.x - backgroundX * 0.1) % (canvas.width + 200);
    const y = cloud.y;
    const s = cloud.size;

    // Simple cloud shapes
    ctx.beginPath();
    ctx.arc(x, y, 30 * s, 0, Math.PI * 2);
    ctx.arc(x + 40 * s, y, 35 * s, 0, Math.PI * 2);
    ctx.arc(x + 80 * s, y, 30 * s, 0, Math.PI * 2);
    ctx.fill();
  });
}

// Clean palm tree design
function drawCleanPalmTree(x, y) {
  if (x < -100 || x > canvas.width + 100) return;

  // Trunk
  ctx.fillStyle = '#7C5D3B';
  ctx.fillRect(x, y - 70, 15, 70);

  // Trunk segments
  ctx.strokeStyle = '#5A4228';
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(x, y - 70 + i * 15);
    ctx.lineTo(x + 15, y - 70 + i * 15);
    ctx.stroke();
  }

  // Palm leaves - cleaner design
  ctx.fillStyle = '#3D8B37';
  for (let i = 0; i < 6; i++) {
    ctx.save();
    ctx.translate(x + 7.5, y - 70);
    ctx.rotate((i * Math.PI) / 3);

    // Leaf
    ctx.beginPath();
    ctx.ellipse(0, -20, 6, 25, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// Old palm tree function removed - using drawCleanPalmTree instead

// Draw laptop obstacle
function drawObstacle(obstacle) {
  const x = obstacle.x;
  const y = GROUND_HEIGHT - 80;

  // LAPTOP BASE
  ctx.fillStyle = '#2C3E50';
  ctx.fillRect(x + 10, y + 60, 80, 10);
  ctx.fillRect(x, y + 70, 100, 5);

  // LAPTOP SCREEN BACK
  ctx.fillStyle = '#34495E';
  ctx.fillRect(x + 15, y, 70, 65);

  // SCREEN BORDER (silver/gray)
  ctx.strokeStyle = '#7F8C8D';
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 15, y, 70, 65);

  // SCREEN DISPLAY (blue glow)
  const screenGradient = ctx.createLinearGradient(x + 20, y + 5, x + 20, y + 60);
  screenGradient.addColorStop(0, '#3498DB');
  screenGradient.addColorStop(1, '#2980B9');
  ctx.fillStyle = screenGradient;
  ctx.fillRect(x + 20, y + 5, 60, 55);

  // Question mark on screen (pulsing)
  const pulse = Math.sin(Date.now() / 300) * 0.2 + 0.8;
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', x + 50, y + 32);
  ctx.globalAlpha = 1;

  // Level indicator on screen
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 12px Arial';
  ctx.fillText(`LEVEL ${obstacle.level + 1}`, x + 50, y + 55);

  // KEYBOARD
  ctx.fillStyle = '#2C3E50';
  ctx.fillRect(x + 20, y + 63, 60, 7);

  // Keyboard keys (small rectangles)
  ctx.fillStyle = '#1A1A1A';
  for (let i = 0; i < 8; i++) {
    ctx.fillRect(x + 22 + i * 7, y + 64, 5, 5);
  }

  ctx.textBaseline = 'alphabetic';
}

// Create obstacle for level
function createObstacle(level) {
  obstacles.push({
    x: canvas.width + 100,
    level: level,
    passed: false
  });
}

// Check collision with obstacle (laptop)
function checkCollision(obstacle) {
  return (
    player.x < obstacle.x + 100 &&
    player.x + player.width > obstacle.x &&
    player.y < GROUND_HEIGHT - 80 + 75 &&
    player.y + player.height > GROUND_HEIGHT - 80
  );
}

// Update game
function update() {
  if (!gameRunning || waitingForAnswer) return;

  // FIXED MOVEMENT - Player moves on screen, background scrolls when needed
  const SCROLL_THRESHOLD = canvas.width / 2; // Start scrolling when player passes middle

  if (keys['ArrowRight']) {
    player.direction = 1;

    // Move player right if before threshold
    if (player.x < SCROLL_THRESHOLD) {
      player.x += MOVE_SPEED;
    } else {
      // Once past threshold, scroll the world
      backgroundX += MOVE_SPEED * 0.5; // Slower parallax
      palmX += MOVE_SPEED * 0.7;

      // Move obstacles left to simulate world scrolling
      obstacles.forEach(obs => obs.x -= MOVE_SPEED);
    }
  }

  if (keys['ArrowLeft'] && player.x > 50) {
    player.direction = -1;
    player.x -= MOVE_SPEED;
  }

  // Apply gravity
  player.velocityY += GRAVITY;
  player.y += player.velocityY;

  // Ground collision
  if (player.y >= GROUND_HEIGHT - player.height) {
    player.y = GROUND_HEIGHT - player.height;
    player.velocityY = 0;
    player.isJumping = false;
  }

  // Check obstacle collision
  obstacles.forEach(obstacle => {
    if (checkCollision(obstacle) && !obstacle.passed) {
      waitingForAnswer = true;
      gameRunning = false;

      // Start voting for this level
      socket.emit('startVoting', {
        level: obstacle.level,
        question: questions[obstacle.level].question,
        options: questions[obstacle.level].options
      });

      obstacle.passed = true;
    }
  });

  // Remove off-screen obstacles
  obstacles = obstacles.filter(obs => obs.x > -100);

  // Create new obstacles when needed
  if (obstacles.length === 0 && currentLevel < questions.length && !waitingForAnswer) {
    createObstacle(currentLevel);
  }
}

// Draw heart (for health display)
function drawHeart(x, y, filled) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(0.8, 0.8);

  if (filled) {
    ctx.fillStyle = '#FF0000';
  } else {
    ctx.fillStyle = '#666666';
  }

  // Heart shape
  ctx.beginPath();
  ctx.moveTo(0, 10);
  ctx.bezierCurveTo(-10, 0, -20, 10, 0, 30);
  ctx.bezierCurveTo(20, 10, 10, 0, 0, 10);
  ctx.fill();

  // Heart outline
  ctx.strokeStyle = '#8B0000';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}

// Draw game
function draw() {
  drawBackground();

  obstacles.forEach(drawObstacle);
  drawPlayer();

  // Draw UI with RETRO FONT and GLOW
  ctx.shadowColor = '#FFD700';
  ctx.shadowBlur = 8;
  ctx.fillStyle = '#FFFF00';
  ctx.strokeStyle = '#FF1493';
  ctx.lineWidth = 3;
  ctx.font = 'bold 28px "Press Start 2P", monospace';
  ctx.textAlign = 'left';
  ctx.strokeText(`LEVEL ${currentLevel + 1}/${questions.length}`, 20, 40);
  ctx.fillText(`LEVEL ${currentLevel + 1}/${questions.length}`, 20, 40);
  ctx.shadowBlur = 0;

  // Draw hearts (health bar)
  for (let i = 0; i < 3; i++) {
    drawHeart(canvas.width - 150 + i * 50, 30, i < playerLives);
  }

  if (gameWon) {
    drawVictoryScreen();
  }
}

// Game loop
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// Start game
function startGame() {
  gameRunning = true;
  currentLevel = 0;
  obstacles = [];
  gameWon = false;
  playerLives = 3; // Reset lives
  player.y = GROUND_HEIGHT - player.height;
  player.velocityY = 0;
  createObstacle(0);

  // Start background music
  playBackgroundMusic();
}

// Socket.IO event handlers
socket.on('connect', () => {
  console.log('Connected to server');
  loadQRCode();
});

socket.on('votingStarted', (data) => {
  console.log('Voting started:', data);
  document.getElementById('votingInfo').classList.add('active');
  document.getElementById('questionText').textContent = data.question;
  startVotingTimer(data.timeLimit);
});

socket.on('voteUpdate', (data) => {
  document.getElementById('voteCount').textContent = `Votes: ${data.totalVotes}`;
});

socket.on('votingEnded', (result) => {
  console.log('Voting ended:', result);
  document.getElementById('votingInfo').classList.remove('active');

  const correctAnswer = questions[currentLevel].correct;
  const playerAnswer = result.winningAnswer;
  const isCorrect = playerAnswer === correctAnswer;

  // Play appropriate sound
  if (isCorrect) {
    playSound('correct');
    playSound('coin');
  } else {
    playSound('wrong');
  }

  // Show explanation modal
  showExplanationModal(isCorrect, currentLevel);
});

// Show explanation modal
function showExplanationModal(isCorrect, levelIndex) {
  const modal = document.getElementById('explanationModal');
  const question = questions[levelIndex];

  // Set result text
  const resultElement = document.getElementById('modalResult');
  if (isCorrect) {
    resultElement.textContent = '✅ CORRECT!';
    resultElement.className = 'modal-result correct';
  } else {
    resultElement.textContent = '❌ WRONG!';
    resultElement.className = 'modal-result wrong';
  }

  // Set question text
  document.getElementById('modalQuestion').textContent = question.question;

  // Set correct answer
  document.getElementById('modalCorrectAnswer').textContent = question.correct;

  // Set explanation
  document.getElementById('modalExplanation').textContent = question.explanation;

  // Show modal
  modal.classList.add('active');
}

// Continue button handler
document.getElementById('continueBtn').addEventListener('click', () => {
  const modal = document.getElementById('explanationModal');
  modal.classList.remove('active');

  const correctAnswer = questions[currentLevel].correct;
  const wasCorrect = document.getElementById('modalResult').classList.contains('correct');

  if (wasCorrect) {
    // Correct answer - continue to next level
    currentLevel++;

    if (currentLevel >= questions.length) {
      // Game won!
      gameWon = true;
      showConfetti();
    } else {
      // Next level
      waitingForAnswer = false;
      gameRunning = true;
      createObstacle(currentLevel);
    }
  } else {
    // Wrong answer - lose a life
    playerLives--;

    if (playerLives <= 0) {
      // Game over - restart
      socket.emit('resetGame');
      currentLevel = 0;
      playerLives = 3;
      waitingForAnswer = false;
      startGame();
    } else {
      // Still have lives - continue but don't advance level
      waitingForAnswer = false;
      gameRunning = true;
      // Recreate the same obstacle
      obstacles = [];
      createObstacle(currentLevel);
    }
  }
});

// QR Code
async function loadQRCode() {
  try {
    const response = await fetch('/qr');
    const data = await response.json();
    document.getElementById('qrCode').innerHTML = `<img src="${data.qrCode}" alt="QR Code" style="width: 150px; height: 150px;">`;
    document.getElementById('voteUrl').textContent = data.url;
  } catch (error) {
    console.error('Failed to load QR code:', error);
  }
}

// Voting timer
let timerInterval;
function startVotingTimer(seconds) {
  let timeLeft = seconds;
  document.getElementById('timer').textContent = timeLeft;

  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeLeft--;
    document.getElementById('timer').textContent = timeLeft;

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
    }
  }, 1000);
}

// Confetti animation with VIBRANT COLORS
function showConfetti() {
  const particles = [];
  // VIBRANT retro game colors
  const colors = ['#FF1493', '#00FF00', '#FFD700', '#FF6B9D', '#00FFFF', '#FF8C00', '#9400D3', '#FFFF00'];

  for (let i = 0; i < 200; i++) {
    particles.push({
      x: Math.random() * confettiCanvas.width,
      y: -10,
      vx: (Math.random() - 0.5) * 6,
      vy: Math.random() * 4 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 12 + 6,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 15,
      shape: Math.random() > 0.5 ? 'square' : 'circle'
    });
  }

  function animateConfetti() {
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

    let active = false;
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
      p.rotation += p.rotationSpeed;

      if (p.y < confettiCanvas.height) {
        active = true;
        confettiCtx.save();
        confettiCtx.translate(p.x, p.y);
        confettiCtx.rotate((p.rotation * Math.PI) / 180);
        confettiCtx.fillStyle = p.color;

        // Draw different shapes
        if (p.shape === 'circle') {
          confettiCtx.beginPath();
          confettiCtx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          confettiCtx.fill();
        } else {
          confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        }

        confettiCtx.restore();
      }
    });

    if (active) {
      requestAnimationFrame(animateConfetti);
    }
  }

  animateConfetti();
}

// Victory screen with RETRO STYLING
function drawVictoryScreen() {
  // Pulsating background
  const pulse = Math.sin(Date.now() / 200) * 0.1 + 0.7;
  ctx.fillStyle = `rgba(0, 0, 0, ${pulse})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Animated rainbow background box
  const time = Date.now() / 1000;
  const rainbowGradient = ctx.createLinearGradient(0, canvas.height / 2 - 150, canvas.width, canvas.height / 2 + 150);
  rainbowGradient.addColorStop(0, `hsl(${(time * 50) % 360}, 100%, 50%)`);
  rainbowGradient.addColorStop(0.5, `hsl(${(time * 50 + 120) % 360}, 100%, 50%)`);
  rainbowGradient.addColorStop(1, `hsl(${(time * 50 + 240) % 360}, 100%, 50%)`);
  ctx.fillStyle = rainbowGradient;
  ctx.fillRect(50, canvas.height / 2 - 150, canvas.width - 100, 300);

  // Main title with GLOW
  const titlePulse = Math.sin(Date.now() / 150) * 10 + 10;
  ctx.shadowColor = '#FFD700';
  ctx.shadowBlur = titlePulse;

  ctx.strokeStyle = '#FF1493';
  ctx.lineWidth = 8;
  ctx.font = 'bold 48px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.strokeText('CONGRATULATIONS!', canvas.width / 2, canvas.height / 2 - 60);

  ctx.fillStyle = '#FFFF00';
  ctx.fillText('CONGRATULATIONS!', canvas.width / 2, canvas.height / 2 - 60);

  // Subtitle
  ctx.shadowBlur = 5;
  ctx.strokeStyle = '#9400D3';
  ctx.lineWidth = 4;
  ctx.font = 'bold 24px "Press Start 2P", monospace';
  ctx.strokeText('YOU MASTERED', canvas.width / 2, canvas.height / 2 - 10);
  ctx.fillStyle = '#00FF00';
  ctx.fillText('YOU MASTERED', canvas.width / 2, canvas.height / 2 - 10);

  ctx.strokeText('ALL LEVELS!', canvas.width / 2, canvas.height / 2 + 25);
  ctx.fillStyle = '#00FFFF';
  ctx.fillText('ALL LEVELS!', canvas.width / 2, canvas.height / 2 + 25);

  // Play again instruction
  ctx.shadowBlur = 3;
  ctx.font = '16px "Press Start 2P", monospace';
  const playAgainPulse = Math.sin(Date.now() / 300) * 0.5 + 0.5;
  ctx.fillStyle = `rgba(255, 255, 255, ${playAgainPulse})`;
  ctx.fillText('PRESS F5 TO PLAY AGAIN', canvas.width / 2, canvas.height / 2 + 80);

  ctx.shadowBlur = 0;

  // Trophy/stars animation
  for (let i = 0; i < 5; i++) {
    const starX = canvas.width / 2 - 100 + i * 50;
    const starY = canvas.height / 2 + 120 + Math.sin(time * 2 + i) * 10;
    drawStar(starX, starY, 15, '#FFD700');
  }
}

// Draw retro star
function drawStar(x, y, size, color) {
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    const px = x + Math.cos(angle) * size;
    const py = y + Math.sin(angle) * size;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
}

// Initialize game
startGame();
gameLoop();
