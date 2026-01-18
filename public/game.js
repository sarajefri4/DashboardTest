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
const MOVE_SPEED = 5;
const GROUND_HEIGHT = 500;

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

// Input handling
const keys = {};

window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'Space' && !player.isJumping && gameRunning) {
    player.velocityY = JUMP_FORCE;
    player.isJumping = true;
  }
});

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

// Draw 8-bit Arab character with thob and ghutra
function drawPlayer() {
  const x = player.x;
  const y = player.y;
  const scale = 4;

  // Animation
  player.animationCounter++;
  if (player.animationCounter > 10) {
    player.animationFrame = (player.animationFrame + 1) % 2;
    player.animationCounter = 0;
  }

  ctx.save();
  if (player.direction === -1) {
    ctx.scale(-1, 1);
    ctx.translate(-x * 2 - player.width, 0);
  }

  // Ghutra (headscarf) - white with red/white checkered pattern
  ctx.fillStyle = '#ffffff';
  // Head base
  ctx.fillRect(x + 14 * scale, y + 2 * scale, 8 * scale, 8 * scale);

  // Red checkered pattern on ghutra
  ctx.fillStyle = '#dc143c';
  ctx.fillRect(x + 15 * scale, y + 3 * scale, 2 * scale, 2 * scale);
  ctx.fillRect(x + 19 * scale, y + 3 * scale, 2 * scale, 2 * scale);
  ctx.fillRect(x + 17 * scale, y + 5 * scale, 2 * scale, 2 * scale);

  // Black agal (headband)
  ctx.fillStyle = '#000000';
  ctx.fillRect(x + 14 * scale, y + 5 * scale, 8 * scale, 2 * scale);

  // Face (tan/brown skin tone)
  ctx.fillStyle = '#d4a574';
  ctx.fillRect(x + 16 * scale, y + 7 * scale, 4 * scale, 4 * scale);

  // Eyes
  ctx.fillStyle = '#000000';
  ctx.fillRect(x + 16 * scale, y + 8 * scale, 1 * scale, 1 * scale);
  ctx.fillRect(x + 19 * scale, y + 8 * scale, 1 * scale, 1 * scale);

  // Beard
  ctx.fillStyle = '#2c1810';
  ctx.fillRect(x + 16 * scale, y + 10 * scale, 4 * scale, 1 * scale);

  // Thob (white traditional dress)
  ctx.fillStyle = '#f5f5f5';
  ctx.fillRect(x + 14 * scale, y + 11 * scale, 8 * scale, 5 * scale);

  // Thob details (collar/buttons)
  ctx.fillStyle = '#e0e0e0';
  ctx.fillRect(x + 17 * scale, y + 12 * scale, 2 * scale, 3 * scale);

  // Legs
  if (player.animationFrame === 0) {
    ctx.fillRect(x + 15 * scale, y + 16 * scale, 2 * scale, 4 * scale);
    ctx.fillRect(x + 19 * scale, y + 16 * scale, 2 * scale, 4 * scale);
  } else {
    ctx.fillRect(x + 15 * scale, y + 16 * scale, 2 * scale, 3 * scale);
    ctx.fillRect(x + 19 * scale, y + 16 * scale, 2 * scale, 5 * scale);
  }

  // Feet (sandals)
  ctx.fillStyle = '#8b4513';
  ctx.fillRect(x + 15 * scale, y + 19 * scale, 2 * scale, 1 * scale);
  ctx.fillRect(x + 19 * scale, y + 19 * scale, 2 * scale, 1 * scale);

  ctx.restore();
}

// Draw office background
function drawBackground() {
  // Sky gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#87ceeb');
  gradient.addColorStop(1, '#e0f6ff');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Clouds (parallax)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  for (let i = 0; i < 5; i++) {
    const x = (cloudX * 0.5 + i * 200) % (canvas.width + 100);
    drawCloud(x - 100, 50 + i * 30);
  }

  // Office buildings in background
  ctx.fillStyle = '#5a5a5a';
  for (let i = 0; i < 10; i++) {
    const x = (backgroundX * 0.3 + i * 150) % (canvas.width + 200);
    const height = 150 + (i % 3) * 50;
    ctx.fillRect(x - 200, GROUND_HEIGHT - height, 80, height);

    // Windows
    ctx.fillStyle = '#ffeb3b';
    for (let row = 0; row < height / 20; row++) {
      for (let col = 0; col < 4; col++) {
        ctx.fillRect(x - 200 + 10 + col * 18, GROUND_HEIGHT - height + 10 + row * 20, 8, 12);
      }
    }
    ctx.fillStyle = '#5a5a5a';
  }

  // Ground (office floor)
  ctx.fillStyle = '#8b8b8b';
  ctx.fillRect(0, GROUND_HEIGHT, canvas.width, canvas.height - GROUND_HEIGHT);

  // Floor tiles
  ctx.strokeStyle = '#6b6b6b';
  ctx.lineWidth = 2;
  for (let i = 0; i < canvas.width; i += 50) {
    ctx.beginPath();
    ctx.moveTo(i, GROUND_HEIGHT);
    ctx.lineTo(i, canvas.height);
    ctx.stroke();
  }
}

function drawCloud(x, y) {
  ctx.beginPath();
  ctx.arc(x, y, 20, 0, Math.PI * 2);
  ctx.arc(x + 15, y - 5, 25, 0, Math.PI * 2);
  ctx.arc(x + 30, y, 20, 0, Math.PI * 2);
  ctx.fill();
}

// Draw obstacle (quiz question)
function drawObstacle(obstacle) {
  const x = obstacle.x;
  const y = GROUND_HEIGHT - 100;

  // Quiz board stand
  ctx.fillStyle = '#8b4513';
  ctx.fillRect(x + 35, y + 80, 10, 100);

  // Quiz board
  ctx.fillStyle = '#2c3e50';
  ctx.fillRect(x, y, 80, 80);
  ctx.strokeStyle = '#ecf0f1';
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, 80, 80);

  // Question mark
  ctx.fillStyle = '#e74c3c';
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('?', x + 40, y + 55);

  // Level number
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px Arial';
  ctx.fillText(`L${obstacle.level + 1}`, x + 40, y + 75);
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
    player.x < obstacle.x + 80 &&
    player.x + player.width > obstacle.x &&
    player.y < GROUND_HEIGHT - 100 + 80 &&
    player.y + player.height > GROUND_HEIGHT - 100
  );
}

// Update game
function update() {
  if (!gameRunning || waitingForAnswer) return;

  // Player movement
  if (keys['ArrowRight']) {
    player.direction = 1;
    backgroundX += MOVE_SPEED;
    cloudX += MOVE_SPEED;

    // Move obstacles
    obstacles.forEach(obs => obs.x -= MOVE_SPEED);
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

  // Draw UI
  ctx.fillStyle = '#000';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`Level: ${currentLevel + 1}/${questions.length}`, 20, 40);

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
    // Correct answer - continue game
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
    // Wrong answer - game over
    alert(`Wrong answer! The correct answer was: ${correctAnswer}\n\nGame Over! Restarting...`);
    setTimeout(() => {
      socket.emit('resetGame');
      startGame();
      waitingForAnswer = false;
    }, 1000);
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

// Confetti animation
function showConfetti() {
  const particles = [];
  const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];

  for (let i = 0; i < 150; i++) {
    particles.push({
      x: Math.random() * confettiCanvas.width,
      y: -10,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 3 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 4,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10
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
        confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        confettiCtx.restore();
      }
    });

    if (active) {
      requestAnimationFrame(animateConfetti);
    }
  }

  animateConfetti();
}

// Victory screen
function drawVictoryScreen() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 64px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('🎉 CONGRATULATIONS! 🎉', canvas.width / 2, canvas.height / 2 - 40);

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 32px Arial';
  ctx.fillText('You completed all levels!', canvas.width / 2, canvas.height / 2 + 20);

  ctx.font = '24px Arial';
  ctx.fillText('Press F5 to play again', canvas.width / 2, canvas.height / 2 + 60);
}

// Initialize game
startGame();
gameLoop();
