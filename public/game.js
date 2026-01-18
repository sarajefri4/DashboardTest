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

// Questions for each level
const questions = [
  {
    question: "What is the capital of Saudi Arabia?",
    options: ["Riyadh", "Jeddah"],
    correct: "Riyadh"
  },
  {
    question: "How many pillars are in Islam?",
    options: ["5", "7"],
    correct: "5"
  },
  {
    question: "What year was Saudi Arabia founded?",
    options: ["1932", "1945"],
    correct: "1932"
  },
  {
    question: "What is the tallest building in Saudi Arabia?",
    options: ["Abraj Al Bait", "Kingdom Centre"],
    correct: "Abraj Al Bait"
  },
  {
    question: "What sea is to the west of Saudi Arabia?",
    options: ["Red Sea", "Arabian Sea"],
    correct: "Red Sea"
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

// Draw ENHANCED 8-bit Arab character with HIGH QUALITY pixel art
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

  // ENHANCED Ghutra (headscarf) - BRIGHT white with RED checkered pattern
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(x + 13 * scale, y + 1 * scale, 10 * scale, 9 * scale);

  // RED checkered pattern (more detailed)
  ctx.fillStyle = '#FF0000';
  ctx.fillRect(x + 14 * scale, y + 2 * scale, 2 * scale, 2 * scale);
  ctx.fillRect(x + 18 * scale, y + 2 * scale, 2 * scale, 2 * scale);
  ctx.fillRect(x + 16 * scale, y + 4 * scale, 2 * scale, 2 * scale);
  ctx.fillRect(x + 20 * scale, y + 4 * scale, 2 * scale, 2 * scale);
  ctx.fillRect(x + 14 * scale, y + 6 * scale, 2 * scale, 2 * scale);
  ctx.fillRect(x + 18 * scale, y + 6 * scale, 2 * scale, 2 * scale);

  // GOLD highlights on ghutra
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(x + 15 * scale, y + 3 * scale, 1 * scale, 1 * scale);
  ctx.fillRect(x + 19 * scale, y + 5 * scale, 1 * scale, 1 * scale);

  // BLACK agal (headband) - thicker and more prominent
  ctx.fillStyle = '#000000';
  ctx.fillRect(x + 13 * scale, y + 6 * scale, 10 * scale, 2 * scale);

  // Gold accent on agal
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(x + 13 * scale, y + 6 * scale, 10 * scale, 1 * scale);

  // FACE (warm tan skin tone)
  ctx.fillStyle = '#D4A574';
  ctx.fillRect(x + 15 * scale, y + 8 * scale, 6 * scale, 5 * scale);

  // Face shadow/depth
  ctx.fillStyle = '#C49563';
  ctx.fillRect(x + 15 * scale, y + 11 * scale, 6 * scale, 2 * scale);

  // EYES (expressive)
  ctx.fillStyle = '#000000';
  ctx.fillRect(x + 16 * scale, y + 9 * scale, 2 * scale, 2 * scale);
  ctx.fillRect(x + 19 * scale, y + 9 * scale, 2 * scale, 2 * scale);

  // Eye whites
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(x + 16 * scale, y + 9 * scale, 1 * scale, 1 * scale);
  ctx.fillRect(x + 19 * scale, y + 9 * scale, 1 * scale, 1 * scale);

  // BEARD (dark brown)
  ctx.fillStyle = '#3D2817';
  ctx.fillRect(x + 15 * scale, y + 12 * scale, 2 * scale, 1 * scale);
  ctx.fillRect(x + 19 * scale, y + 12 * scale, 2 * scale, 1 * scale);

  // THOB (pristine white traditional dress)
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(x + 13 * scale, y + 13 * scale, 10 * scale, 6 * scale);

  // Thob shadows for depth
  ctx.fillStyle = '#F0F0F0';
  ctx.fillRect(x + 14 * scale, y + 14 * scale, 2 * scale, 5 * scale);
  ctx.fillRect(x + 20 * scale, y + 14 * scale, 2 * scale, 5 * scale);

  // Golden collar details
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(x + 17 * scale, y + 13 * scale, 2 * scale, 1 * scale);

  // Center button line (detailed)
  ctx.fillStyle = '#E0E0E0';
  ctx.fillRect(x + 17 * scale, y + 14 * scale, 2 * scale, 4 * scale);

  // Golden buttons
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(x + 17 * scale, y + 15 * scale, 2 * scale, 1 * scale);
  ctx.fillRect(x + 17 * scale, y + 17 * scale, 2 * scale, 1 * scale);

  // LEGS with walking animation
  ctx.fillStyle = '#FFFFFF';
  if (player.animationFrame === 0) {
    ctx.fillRect(x + 14 * scale, y + 19 * scale, 3 * scale, 5 * scale);
    ctx.fillRect(x + 19 * scale, y + 19 * scale, 3 * scale, 5 * scale);
  } else {
    ctx.fillRect(x + 14 * scale, y + 19 * scale, 3 * scale, 4 * scale);
    ctx.fillRect(x + 19 * scale, y + 19 * scale, 3 * scale, 6 * scale);
  }

  // SANDALS (brown leather)
  ctx.fillStyle = '#8B4513';
  if (player.animationFrame === 0) {
    ctx.fillRect(x + 14 * scale, y + 23 * scale, 3 * scale, 1 * scale);
    ctx.fillRect(x + 19 * scale, y + 23 * scale, 3 * scale, 1 * scale);
  } else {
    ctx.fillRect(x + 14 * scale, y + 22 * scale, 3 * scale, 1 * scale);
    ctx.fillRect(x + 19 * scale, y + 24 * scale, 3 * scale, 1 * scale);
  }

  // GOLD outline/glow effect around character
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.5;
  ctx.strokeRect(x + 13 * scale, y + 1 * scale, 10 * scale, 23 * scale);
  ctx.globalAlpha = 1;

  ctx.restore();
}

// Draw CLEAN office-themed background
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

  // PALM TREES (Riyadh element - but cleaner)
  for (let i = 0; i < 6; i++) {
    const x = (i * 200 - palmX * 0.5) % (canvas.width + 300);
    drawCleanPalmTree(x, GROUND_HEIGHT);
  }

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

// Draw clean quiz obstacle
function drawObstacle(obstacle) {
  const x = obstacle.x;
  const y = GROUND_HEIGHT - 140;

  // Clean quiz board stand
  ctx.fillStyle = '#5A4228';
  ctx.fillRect(x + 45, y + 110, 10, GROUND_HEIGHT - y - 110);

  // Quiz board - clean orange/brown design (like screenshot)
  const boardGradient = ctx.createLinearGradient(x, y, x + 100, y + 110);
  boardGradient.addColorStop(0, '#E67E22');
  boardGradient.addColorStop(1, '#D35400');
  ctx.fillStyle = boardGradient;
  ctx.fillRect(x, y, 100, 110);

  // Border
  ctx.strokeStyle = '#8B4513';
  ctx.lineWidth = 4;
  ctx.strokeRect(x, y, 100, 110);

  // Question mark
  ctx.fillStyle = '#FF0000';
  ctx.font = 'bold 72px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', x + 50, y + 55);

  // Level badge (cleaner design)
  ctx.fillStyle = '#2C3E50';
  ctx.fillRect(x + 30, y + 5, 40, 20);
  ctx.fillStyle = '#ECF0F1';
  ctx.font = 'bold 14px Arial';
  ctx.fillText(`${obstacle.level + 1}`, x + 50, y + 15);
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

// Check collision with obstacle
function checkCollision(obstacle) {
  return (
    player.x < obstacle.x + 100 &&
    player.x + player.width > obstacle.x &&
    player.y < GROUND_HEIGHT - 140 + 110 &&
    player.y + player.height > GROUND_HEIGHT - 140
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

  if (playerAnswer === correctAnswer) {
    // CORRECT ANSWER - play success sound!
    playSound('correct');
    playSound('coin');

    currentLevel++;

    if (currentLevel >= questions.length) {
      // Game won!
      gameWon = true;
      showConfetti();
    } else {
      // Next level
      setTimeout(() => {
        waitingForAnswer = false;
        gameRunning = true;
        createObstacle(currentLevel);
      }, 2000);
    }
  } else {
    // WRONG ANSWER - play error sound
    playSound('wrong');

    // Better game over message
    setTimeout(() => {
      alert(`❌ WRONG ANSWER! ❌\n\nThe correct answer was: ${correctAnswer}\n\n🎮 GAME OVER! 🎮\n\nRestarting...`);
      socket.emit('resetGame');
      startGame();
      waitingForAnswer = false;
    }, 500);
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
