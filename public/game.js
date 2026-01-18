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

// Draw RIYADH-themed background with VIBRANT COLORS
function drawBackground() {
  // VIBRANT Desert Sunset Sky Gradient (inspired by Arabian nights)
  const gradient = ctx.createLinearGradient(0, 0, 0, GROUND_HEIGHT);
  gradient.addColorStop(0, '#FF6B9D');  // Pink/magenta sunset
  gradient.addColorStop(0.3, '#FFA07A'); // Light salmon
  gradient.addColorStop(0.6, '#FFD700'); // Golden yellow
  gradient.addColorStop(1, '#87CEEB');   // Sky blue at horizon
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, GROUND_HEIGHT);

  // STARS (twinkling effect)
  starOffset += 0.01;
  ctx.fillStyle = '#FFFFFF';
  for (let i = 0; i < 30; i++) {
    const x = (i * 50 + Math.sin(starOffset + i) * 3) % canvas.width;
    const y = (i * 20) % (GROUND_HEIGHT / 2);
    const twinkle = Math.sin(starOffset * 3 + i) * 0.5 + 0.5;
    ctx.globalAlpha = twinkle;
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.globalAlpha = 1;

  // CRESCENT MOON
  ctx.fillStyle = '#FFFFAA';
  ctx.beginPath();
  ctx.arc(700, 80, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(710, 75, 30, 0, Math.PI * 2);
  ctx.fill();

  // KINGDOM TOWER and Al Faisaliah Tower in background (VIBRANT)
  const towers = [
    { x: 150, height: 250, color: '#4A90E2', name: 'Kingdom' },
    { x: 400, height: 200, color: '#9B59B6', name: 'Faisaliah' },
    { x: 650, height: 180, color: '#E74C3C', name: 'Modern' }
  ];

  towers.forEach(tower => {
    const x = (backgroundX * 0.2 + tower.x) % (canvas.width + 300) - 300;

    // Tower body - VIBRANT colors
    const towerGradient = ctx.createLinearGradient(x, GROUND_HEIGHT - tower.height, x, GROUND_HEIGHT);
    towerGradient.addColorStop(0, tower.color);
    towerGradient.addColorStop(1, '#2C3E50');
    ctx.fillStyle = towerGradient;
    ctx.fillRect(x, GROUND_HEIGHT - tower.height, 60, tower.height);

    // Kingdom Tower signature triangle top
    if (tower.name === 'Kingdom') {
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.moveTo(x, GROUND_HEIGHT - tower.height);
      ctx.lineTo(x + 30, GROUND_HEIGHT - tower.height - 30);
      ctx.lineTo(x + 60, GROUND_HEIGHT - tower.height);
      ctx.fill();

      // Opening/hole at top
      ctx.fillStyle = gradient;
      ctx.fillRect(x + 20, GROUND_HEIGHT - tower.height - 20, 20, 15);
    }

    // BRIGHT Windows
    ctx.fillStyle = '#FFFF00';
    for (let row = 0; row < tower.height / 15; row++) {
      for (let col = 0; col < 3; col++) {
        if (Math.random() > 0.3) { // Some windows lit, some dark
          ctx.fillRect(x + 8 + col * 18, GROUND_HEIGHT - tower.height + 10 + row * 15, 10, 8);
        }
      }
    }
  });

  // SAND DUNES (wavy desert floor)
  ctx.fillStyle = '#F4A460';  // Sandy brown
  ctx.beginPath();
  ctx.moveTo(0, GROUND_HEIGHT);
  for (let x = 0; x <= canvas.width; x += 10) {
    const y = GROUND_HEIGHT - Math.sin((x + backgroundX * 0.5) / 50) * 10;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(canvas.width, canvas.height);
  ctx.lineTo(0, canvas.height);
  ctx.closePath();
  ctx.fill();

  // PALM TREES (vibrant green)
  ctx.fillStyle = '#228B22';  // Forest green for palm leaves
  for (let i = 0; i < 8; i++) {
    const x = ((palmX * 0.4 + i * 150) % (canvas.width + 200)) - 200;
    drawPalmTree(x, GROUND_HEIGHT - 10);
  }

  // GOLDEN SAND GROUND with pattern
  const sandGradient = ctx.createLinearGradient(0, GROUND_HEIGHT, 0, canvas.height);
  sandGradient.addColorStop(0, '#FFD700');  // Gold
  sandGradient.addColorStop(0.5, '#DAA520'); // Goldenrod
  sandGradient.addColorStop(1, '#B8860B');   // Dark goldenrod
  ctx.fillStyle = sandGradient;
  ctx.fillRect(0, GROUND_HEIGHT, canvas.width, canvas.height - GROUND_HEIGHT);

  // Sand texture (dots)
  ctx.fillStyle = 'rgba(218, 165, 32, 0.3)';
  for (let i = 0; i < canvas.width; i += 20) {
    for (let j = GROUND_HEIGHT; j < canvas.height; j += 20) {
      ctx.fillRect(i + (j % 10), j, 2, 2);
    }
  }
}

// Draw PALM TREE (iconic Riyadh vegetation)
function drawPalmTree(x, y) {
  // Trunk (brown)
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(x + 15, y - 80, 10, 80);

  // Trunk segments
  ctx.strokeStyle = '#654321';
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(x + 15, y - 80 + i * 13);
    ctx.lineTo(x + 25, y - 80 + i * 13);
    ctx.stroke();
  }

  // Palm leaves (VIBRANT green) - 8 directions
  ctx.fillStyle = '#00FF00';  // Bright lime green
  for (let i = 0; i < 8; i++) {
    ctx.save();
    ctx.translate(x + 20, y - 80);
    ctx.rotate((i * Math.PI) / 4);

    // Leaf shape
    ctx.beginPath();
    ctx.ellipse(0, -15, 8, 25, 0, 0, Math.PI * 2);
    ctx.fill();

    // Darker green accent
    ctx.fillStyle = '#32CD32';
    ctx.beginPath();
    ctx.ellipse(0, -15, 4, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#00FF00';

    ctx.restore();
  }

  // Coconuts
  ctx.fillStyle = '#8B4513';
  ctx.beginPath();
  ctx.arc(x + 25, y - 75, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 15, y - 75, 5, 0, Math.PI * 2);
  ctx.fill();
}

// Draw obstacle (VIBRANT quiz board)
function drawObstacle(obstacle) {
  const x = obstacle.x;
  const y = GROUND_HEIGHT - 120;

  // Animated bobbing effect
  const bob = Math.sin(Date.now() / 300) * 3;

  // Golden ornate stand (Islamic architectural style)
  const standGradient = ctx.createLinearGradient(x + 30, y + 100, x + 50, y + 100);
  standGradient.addColorStop(0, '#FFD700');
  standGradient.addColorStop(0.5, '#FFA500');
  standGradient.addColorStop(1, '#FFD700');
  ctx.fillStyle = standGradient;
  ctx.fillRect(x + 30, y + 100 + bob, 20, 100);

  // Stand ornamental base
  ctx.fillStyle = '#FF8C00';
  ctx.fillRect(x + 20, y + 195, 40, 5);

  // VIBRANT Quiz board with Islamic geometric pattern
  const boardGradient = ctx.createLinearGradient(x, y + bob, x + 80, y + bob + 100);
  boardGradient.addColorStop(0, '#FF1493'); // Deep pink
  boardGradient.addColorStop(0.5, '#9400D3'); // Purple
  boardGradient.addColorStop(1, '#4B0082'); // Indigo
  ctx.fillStyle = boardGradient;
  ctx.fillRect(x, y + bob, 80, 100);

  // Golden border with glow
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 4;
  ctx.shadowColor = '#FFD700';
  ctx.shadowBlur = 10;
  ctx.strokeRect(x, y + bob, 80, 100);
  ctx.shadowBlur = 0;

  // Inner decorative frame
  ctx.strokeStyle = '#FFA500';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 5, y + bob + 5, 70, 90);

  // Question mark with GLOW
  ctx.shadowColor = '#FFFF00';
  ctx.shadowBlur = 15;
  ctx.fillStyle = '#FFFF00';
  ctx.font = 'bold 56px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('?', x + 40, y + bob + 60);
  ctx.shadowBlur = 0;

  // Level indicator (bright green)
  ctx.fillStyle = '#00FF00';
  ctx.font = 'bold 18px "Press Start 2P", monospace';
  ctx.fillText(`LVL ${obstacle.level + 1}`, x + 40, y + bob + 85);

  // Animated sparkles around the board
  for (let i = 0; i < 4; i++) {
    const angle = (Date.now() / 500 + i * Math.PI / 2) % (Math.PI * 2);
    const sparkleX = x + 40 + Math.cos(angle) * 50;
    const sparkleY = y + bob + 50 + Math.sin(angle) * 60;
    ctx.fillStyle = i % 2 === 0 ? '#FFD700' : '#FFFFFF';
    ctx.beginPath();
    ctx.arc(sparkleX, sparkleY, 3, 0, Math.PI * 2);
    ctx.fill();
  }
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
    palmX += MOVE_SPEED;

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
