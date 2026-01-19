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

// Victory flag sequence state
let victorySequenceActive = false;
let currentFlagIndex = 0;
let showingFlagText = false;
let flagTextTimer = 0;
let confettiShown = false;

// Qiyas timeline milestones
const qiyasMilestones = [
  {
    date: "January 29",
    text: "Team should review Qiyas 2025 report by the last week of 29 Jan",
    x: 400
  },
  {
    date: "March 1",
    text: "Publication of new Qiyas standards & Objectives",
    x: 750
  },
  {
    date: "April 28",
    text: "Finalize Evidence for first submission",
    x: 1100
  },
  {
    date: "June 10",
    text: "Receive DGA Feedback",
    x: 1450
  },
  {
    date: "July 1",
    text: "Finalize Second Submission",
    x: 1800
  },
  {
    date: "November",
    text: "Announce Results",
    x: 2150
  }
];

// Questions for each level with explanations
const questions = [
  {
    question: "What is Qiyas?",
    options: ["A) A digital transformation evaluation tool", "B) A government budget planning system", "C) A project management framework", "D) A performance review platform"],
    correct: "A) A digital transformation evaluation tool",
    explanation: "Qiyas is a set of evaluation criteria that aims to measure government entities' maturity in digital transformation. It is conducted annually with continuous improvements, uses evidence-based assessment, and strategically transforms and develops business models based on Data, Technology, and Network."
  },
  {
    question: "Which THREE elements are key for a successful Qiyas submission?",
    options: ["A) Documentation, Best Practices, Storytelling", "B) Strategy, Execution, Monitoring", "C) Planning, Implementation, Review", "D) Leadership, Budget, Timeline"],
    correct: "A) Documentation, Best Practices, Storytelling",
    explanation: "A successful Qiyas submission requires comprehensive documentation to provide evidence, alignment with best practices to ensure quality and compliance, and effective storytelling to communicate the value and impact of the work being done."
  },
  {
    question: "What must all key documents have to meet Qiyas standards?",
    options: ["A) Digital signatures", "B) Formal and official approvals", "C) Executive summaries", "D) Version control"],
    correct: "B) Formal and official approvals",
    explanation: "According to the General Feedback, ensuring formal and official approvals for all key documents (Policies, Procedures, Reports, Strategies, Plans, KPIs, Operating Models, etc.) is critical for Qiyas compliance. This demonstrates proper governance and accountability."
  },
  {
    question: "Where is PIF currently on the Qiyas maturity scale?",
    options: ["A) Enablement (البناء)", "B) Availability (الإتاحة)", "C) Optimization (التحسين)", "D) Innovation (الإبداع)"],
    correct: "C) Optimization (التحسين)",
    explanation: "PIF is ranked at 21 among financial and fund institutions and is at the Optimization maturity level. The 2025 results show 50 Compliant, 19 Partial Compliant, and 21 Non-Compliant perspectives. PIF's goal for 2026 is to reach the Innovation scale."
  },
  {
    question: "What practice helps close gaps before the Qiyas submission deadline?",
    options: ["A) Increase proactive communication to address gaps early", "B) Wait until after the deadline to fix issues", "C) Only react to DGA feedback after submission"],
    correct: "A) Increase proactive communication to address gaps early",
    explanation: "According to the General Feedback, increasing proactive communication to address gaps before the submission deadlines is critical for Qiyas success. This allows teams to identify and resolve issues early rather than scrambling at the last minute or waiting for feedback after submission."
  },
  {
    question: "To meet Qiyas requirements, how should responsibilities and deliverables be handled across divisions?",
    options: ["A) Pre-agree and fully align them", "B) Let each division decide independently", "C) Centralise every task in a single department"],
    correct: "A) Pre-agree and fully align them",
    explanation: "The General Feedback emphasizes the importance of fostering cross-division/department alignment, ensuring responsibilities and deliverables are pre-agreed and fully aligned with Qiyas requirements. This ensures everyone is working towards the same goals with clear accountability."
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

  // === PROFESSIONAL AAA PIXEL ART CHARACTER ===

  // HAIR - Black with professional shading and volume
  ctx.fillStyle = '#0B0B0B';
  ctx.fillRect(x + 13 * scale, y + 1 * scale, 10 * scale, 2 * scale); // Top of hair
  ctx.fillRect(x + 12 * scale, y + 3 * scale, 12 * scale, 3 * scale); // Main hair volume
  ctx.fillRect(x + 13 * scale, y + 6 * scale, 10 * scale, 2 * scale); // Lower hair

  // Hair highlights for depth
  ctx.fillStyle = '#2A2A2A';
  ctx.fillRect(x + 14 * scale, y + 2 * scale, 3 * scale, 2 * scale);
  ctx.fillRect(x + 19 * scale, y + 2 * scale, 3 * scale, 2 * scale);
  ctx.fillRect(x + 15 * scale, y + 4 * scale, 2 * scale, 2 * scale);

  // Hair shine (lighter highlights)
  ctx.fillStyle = '#404040';
  ctx.fillRect(x + 15 * scale, y + 2 * scale, 1 * scale, 1 * scale);
  ctx.fillRect(x + 20 * scale, y + 3 * scale, 1 * scale, 1 * scale);

  // FACE - Professional skin tones with smooth gradient
  ctx.fillStyle = '#C49563'; // Base skin
  ctx.fillRect(x + 13 * scale, y + 8 * scale, 10 * scale, 8 * scale);

  // Face highlights (forehead and cheeks)
  ctx.fillStyle = '#D4A574';
  ctx.fillRect(x + 14 * scale, y + 8 * scale, 8 * scale, 2 * scale);
  ctx.fillRect(x + 14 * scale, y + 11 * scale, 2 * scale, 2 * scale);
  ctx.fillRect(x + 20 * scale, y + 11 * scale, 2 * scale, 2 * scale);

  // Face shadows (depth under eyes and jawline)
  ctx.fillStyle = '#B8956B';
  ctx.fillRect(x + 14 * scale, y + 13 * scale, 8 * scale, 1 * scale);
  ctx.fillRect(x + 13 * scale, y + 15 * scale, 10 * scale, 1 * scale);

  // EYES - Detailed and expressive
  // Eye whites
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(x + 14 * scale, y + 10 * scale, 3 * scale, 2 * scale);
  ctx.fillRect(x + 19 * scale, y + 10 * scale, 3 * scale, 2 * scale);

  // Pupils (brown eyes)
  ctx.fillStyle = '#3E2723';
  ctx.fillRect(x + 15 * scale, y + 10 * scale, 2 * scale, 2 * scale);
  ctx.fillRect(x + 20 * scale, y + 10 * scale, 2 * scale, 2 * scale);

  // Eye shine highlights
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(x + 16 * scale, y + 10 * scale, 1 * scale, 1 * scale);
  ctx.fillRect(x + 21 * scale, y + 10 * scale, 1 * scale, 1 * scale);

  // Upper eyelids (depth)
  ctx.fillStyle = '#B8956B';
  ctx.fillRect(x + 14 * scale, y + 9 * scale, 3 * scale, 1 * scale);
  ctx.fillRect(x + 19 * scale, y + 9 * scale, 3 * scale, 1 * scale);

  // EYEBROWS - Defined and expressive
  ctx.fillStyle = '#0B0B0B';
  ctx.fillRect(x + 14 * scale, y + 8 * scale, 3 * scale, 1 * scale);
  ctx.fillRect(x + 19 * scale, y + 8 * scale, 3 * scale, 1 * scale);
  ctx.fillRect(x + 15 * scale, y + 9 * scale, 2 * scale, 1 * scale);
  ctx.fillRect(x + 20 * scale, y + 9 * scale, 2 * scale, 1 * scale);

  // NOSE - Subtle but defined
  ctx.fillStyle = '#B8956B';
  ctx.fillRect(x + 17 * scale, y + 11 * scale, 2 * scale, 2 * scale);
  ctx.fillRect(x + 18 * scale, y + 13 * scale, 2 * scale, 1 * scale);

  // Nose highlight
  ctx.fillStyle = '#D4A574';
  ctx.fillRect(x + 17 * scale, y + 11 * scale, 1 * scale, 1 * scale);

  // MUSTACHE - Professional and prominent
  ctx.fillStyle = '#0B0B0B';
  ctx.fillRect(x + 15 * scale, y + 13 * scale, 6 * scale, 1 * scale);
  ctx.fillRect(x + 14 * scale, y + 14 * scale, 8 * scale, 2 * scale);

  // Mustache highlights
  ctx.fillStyle = '#1A1A1A';
  ctx.fillRect(x + 15 * scale, y + 14 * scale, 3 * scale, 1 * scale);
  ctx.fillRect(x + 19 * scale, y + 14 * scale, 2 * scale, 1 * scale);

  // NECK - Smooth transition
  ctx.fillStyle = '#C49563';
  ctx.fillRect(x + 16 * scale, y + 16 * scale, 4 * scale, 2 * scale);

  // Neck shadow
  ctx.fillStyle = '#B8956B';
  ctx.fillRect(x + 16 * scale, y + 17 * scale, 4 * scale, 1 * scale);

  // THOB - Pure white with professional shading
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(x + 12 * scale, y + 18 * scale, 12 * scale, 12 * scale);

  // Thob shoulders (wider, more natural)
  ctx.fillRect(x + 11 * scale, y + 19 * scale, 14 * scale, 4 * scale);

  // Thob body shadows (left side)
  ctx.fillStyle = '#F0F0F0';
  ctx.fillRect(x + 11 * scale, y + 20 * scale, 2 * scale, 10 * scale);
  ctx.fillRect(x + 13 * scale, y + 22 * scale, 1 * scale, 8 * scale);

  // Thob body shadows (right side)
  ctx.fillRect(x + 23 * scale, y + 20 * scale, 2 * scale, 10 * scale);
  ctx.fillRect(x + 22 * scale, y + 22 * scale, 1 * scale, 8 * scale);

  // Thob center panel (lighter)
  ctx.fillStyle = '#FAFAFA';
  ctx.fillRect(x + 16 * scale, y + 18 * scale, 4 * scale, 12 * scale);

  // Thob collar detail
  ctx.fillStyle = '#E8E8E8';
  ctx.fillRect(x + 15 * scale, y + 18 * scale, 6 * scale, 1 * scale);
  ctx.fillRect(x + 16 * scale, y + 19 * scale, 4 * scale, 1 * scale);

  // Subtle button line
  ctx.fillStyle = '#DCDCDC';
  ctx.fillRect(x + 17 * scale, y + 20 * scale, 2 * scale, 8 * scale);

  // ARMS - Better proportions
  ctx.fillStyle = '#FFFFFF';
  // Left arm
  ctx.fillRect(x + 11 * scale, y + 20 * scale, 2 * scale, 6 * scale);
  // Right arm
  ctx.fillRect(x + 23 * scale, y + 20 * scale, 2 * scale, 6 * scale);

  // Arm shadows
  ctx.fillStyle = '#F0F0F0';
  ctx.fillRect(x + 11 * scale, y + 22 * scale, 1 * scale, 4 * scale);
  ctx.fillRect(x + 24 * scale, y + 22 * scale, 1 * scale, 4 * scale);

  // Hands (skin tone)
  ctx.fillStyle = '#C49563';
  ctx.fillRect(x + 11 * scale, y + 26 * scale, 2 * scale, 2 * scale);
  ctx.fillRect(x + 23 * scale, y + 26 * scale, 2 * scale, 2 * scale);

  // Hand shadows
  ctx.fillStyle = '#B8956B';
  ctx.fillRect(x + 11 * scale, y + 27 * scale, 2 * scale, 1 * scale);
  ctx.fillRect(x + 23 * scale, y + 27 * scale, 2 * scale, 1 * scale);

  // LEGS - Walking animation with thob flowing
  const legOffset = player.animationFrame === 0 ? 0 : 1;

  ctx.fillStyle = '#FFFFFF';
  // Left leg
  if (player.animationFrame === 0) {
    ctx.fillRect(x + 14 * scale, y + 29 * scale, 3 * scale, 5 * scale);
  } else {
    ctx.fillRect(x + 14 * scale, y + 28 * scale, 3 * scale, 6 * scale);
  }

  // Right leg
  if (player.animationFrame === 0) {
    ctx.fillRect(x + 19 * scale, y + 29 * scale, 3 * scale, 6 * scale);
  } else {
    ctx.fillRect(x + 19 * scale, y + 29 * scale, 3 * scale, 5 * scale);
  }

  // Leg shadows
  ctx.fillStyle = '#F0F0F0';
  ctx.fillRect(x + 14 * scale, y + 30 * scale, 1 * scale, 3 * scale);
  ctx.fillRect(x + 19 * scale, y + 30 * scale, 1 * scale, 3 * scale);

  // SANDALS - Brown traditional sandals
  ctx.fillStyle = '#6D4C41';
  if (player.animationFrame === 0) {
    ctx.fillRect(x + 13 * scale, y + 33 * scale, 4 * scale, 2 * scale);
    ctx.fillRect(x + 19 * scale, y + 34 * scale, 4 * scale, 2 * scale);
  } else {
    ctx.fillRect(x + 13 * scale, y + 32 * scale, 4 * scale, 2 * scale);
    ctx.fillRect(x + 19 * scale, y + 33 * scale, 4 * scale, 2 * scale);
  }

  // Sandal highlights
  ctx.fillStyle = '#8D6E63';
  if (player.animationFrame === 0) {
    ctx.fillRect(x + 14 * scale, y + 33 * scale, 2 * scale, 1 * scale);
    ctx.fillRect(x + 20 * scale, y + 34 * scale, 2 * scale, 1 * scale);
  } else {
    ctx.fillRect(x + 14 * scale, y + 32 * scale, 2 * scale, 1 * scale);
    ctx.fillRect(x + 20 * scale, y + 33 * scale, 2 * scale, 1 * scale);
  }

  ctx.restore();
}

// Draw ENHANCED office-themed background with AAA quality
function drawBackground() {
  // === PROFESSIONAL GRADIENT SKY ===
  const skyGradient = ctx.createLinearGradient(0, 0, 0, GROUND_HEIGHT);
  skyGradient.addColorStop(0, '#87CEEB'); // Light blue top
  skyGradient.addColorStop(0.5, '#B0D4E8'); // Mid blue
  skyGradient.addColorStop(1, '#D4E8F0'); // Horizon glow
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, canvas.width, GROUND_HEIGHT);

  // Professional clouds with depth
  drawClouds();

  // === AAA QUALITY OFFICE BUILDINGS ===
  // Using new color palette: #3E4F6B (Slate Blue), #1F7F7A (Deep Teal)
  const buildings = [
    { x: 50, width: 120, height: 300, color: '#3E4F6B', accent: '#2F9DA3' },
    { x: 200, width: 90, height: 380, color: '#1F7F7A', accent: '#4FAF8A' },
    { x: 320, width: 110, height: 260, color: '#3E4F6B', accent: '#2F9DA3' },
    { x: 480, width: 140, height: 420, color: '#2B3F55', accent: '#1F7F7A' },
    { x: 660, width: 100, height: 340, color: '#1F7F7A', accent: '#4FAF8A' },
    { x: 820, width: 115, height: 360, color: '#3E4F6B', accent: '#2F9DA3' },
    { x: 980, width: 130, height: 400, color: '#2B3F55', accent: '#1F7F7A' },
    { x: 1150, width: 105, height: 320, color: '#1F7F7A', accent: '#4FAF8A' }
  ];

  buildings.forEach(building => {
    const x = (building.x - backgroundX * 0.3) % (canvas.width + 500);
    if (x < -building.width - 100 || x > canvas.width + 100) return;

    // Building main body with gradient
    const buildingGradient = ctx.createLinearGradient(x, GROUND_HEIGHT - building.height, x + building.width, GROUND_HEIGHT - building.height);
    buildingGradient.addColorStop(0, building.color);
    buildingGradient.addColorStop(0.3, building.accent);
    buildingGradient.addColorStop(1, building.color);
    ctx.fillStyle = buildingGradient;
    ctx.fillRect(x, GROUND_HEIGHT - building.height, building.width, building.height);

    // Building edge shadows (depth)
    ctx.fillStyle = 'rgba(11, 11, 11, 0.3)';
    ctx.fillRect(x, GROUND_HEIGHT - building.height, 8, building.height); // Left shadow
    ctx.fillRect(x + building.width - 8, GROUND_HEIGHT - building.height, 8, building.height); // Right shadow

    // Rooftop detail
    ctx.fillStyle = building.accent;
    ctx.fillRect(x, GROUND_HEIGHT - building.height, building.width, 12);

    // Rooftop highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(x, GROUND_HEIGHT - building.height, building.width, 4);

    // === PROFESSIONAL OFFICE WINDOWS ===
    // Windows with cool cyan glow (#2F9DA3)
    const windowCols = Math.floor(building.width / 28);
    const windowRows = Math.floor(building.height / 35);

    for (let row = 1; row < windowRows; row++) {
      for (let col = 0; col < windowCols; col++) {
        const wx = x + 14 + col * 28;
        const wy = GROUND_HEIGHT - building.height + 18 + row * 35;

        // Window glow background
        ctx.fillStyle = 'rgba(47, 157, 163, 0.3)';
        ctx.fillRect(wx - 2, wy - 2, 20, 24);

        // Main window (warm office light)
        const windowGradient = ctx.createLinearGradient(wx, wy, wx, wy + 20);
        windowGradient.addColorStop(0, '#FFE6A0');
        windowGradient.addColorStop(1, '#FFC857');
        ctx.fillStyle = windowGradient;
        ctx.fillRect(wx, wy, 16, 20);

        // Window frame
        ctx.strokeStyle = '#0B0B0B';
        ctx.lineWidth = 1;
        ctx.strokeRect(wx, wy, 16, 20);

        // Window cross separator
        ctx.strokeStyle = 'rgba(11, 11, 11, 0.4)';
        ctx.beginPath();
        ctx.moveTo(wx, wy + 10);
        ctx.lineTo(wx + 16, wy + 10);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(wx + 8, wy);
        ctx.lineTo(wx + 8, wy + 20);
        ctx.stroke();

        // Random window lights (some off)
        if (Math.random() > 0.2) {
          ctx.fillStyle = 'rgba(255, 255, 200, 0.3)';
          ctx.fillRect(wx + 2, wy + 2, 6, 6);
        }
      }
    }

    // Building top antenna/details (some buildings)
    if (building.height > 350) {
      ctx.fillStyle = '#0B0B0B';
      const antennaX = x + building.width / 2 - 2;
      ctx.fillRect(antennaX, GROUND_HEIGHT - building.height - 30, 4, 30);

      // Antenna light
      ctx.fillStyle = '#FF0000';
      ctx.beginPath();
      ctx.arc(antennaX + 2, GROUND_HEIGHT - building.height - 32, 4, 0, Math.PI * 2);
      ctx.fill();

      // Light glow
      ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.arc(antennaX + 2, GROUND_HEIGHT - building.height - 32, 8, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // === PROFESSIONAL GROUND ===
  // Modern office floor with sophisticated gradient
  const groundGradient = ctx.createLinearGradient(0, GROUND_HEIGHT, 0, canvas.height);
  groundGradient.addColorStop(0, '#5A5A5A'); // Professional gray
  groundGradient.addColorStop(0.5, '#4A4A4A');
  groundGradient.addColorStop(1, '#3A3A3A');
  ctx.fillStyle = groundGradient;
  ctx.fillRect(0, GROUND_HEIGHT, canvas.width, canvas.height - GROUND_HEIGHT);

  // Polished tile pattern with highlights
  ctx.strokeStyle = '#2A2A2A';
  ctx.lineWidth = 2;
  for (let i = 0; i < canvas.width; i += 50) {
    ctx.beginPath();
    ctx.moveTo(i, GROUND_HEIGHT);
    ctx.lineTo(i, canvas.height);
    ctx.stroke();
  }
  for (let j = GROUND_HEIGHT; j < canvas.height; j += 50) {
    ctx.beginPath();
    ctx.moveTo(0, j);
    ctx.lineTo(canvas.width, j);
    ctx.stroke();
  }

  // Tile highlights for polish
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  for (let i = 1; i < canvas.width; i += 50) {
    ctx.beginPath();
    ctx.moveTo(i, GROUND_HEIGHT);
    ctx.lineTo(i, canvas.height);
    ctx.stroke();
  }

  // Subtle shine effect on ground
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  for (let i = 0; i < canvas.width; i += 100) {
    for (let j = GROUND_HEIGHT; j < canvas.height; j += 100) {
      ctx.fillRect(i + 10, j + 10, 30, 30);
    }
  }

  // AAA QUALITY OFFICE PROPS
  drawOfficeProps();

  // Modern decorative palm trees (Riyadh culture)
  for (let i = 0; i < 5; i++) {
    const x = (i * 250 - palmX * 0.5) % (canvas.width + 400);
    drawModernPalmTree(x, GROUND_HEIGHT);
  }
}

// Draw AAA quality office props with new color palette
function drawOfficeProps() {
  const props = [
    { type: 'desk', x: 150 },
    { type: 'plant', x: 280 },
    { type: 'chair', x: 380 },
    { type: 'cabinet', x: 480 },
    { type: 'water', x: 620 },
    { type: 'desk', x: 780 },
    { type: 'plant', x: 920 },
    { type: 'coffee', x: 1040 },
    { type: 'chair', x: 1160 },
    { type: 'water', x: 1300 },
    { type: 'desk', x: 1460 },
    { type: 'cabinet', x: 1600 },
    { type: 'plant', x: 1720 },
    { type: 'chair', x: 1840 },
    { type: 'desk', x: 2000 },
    { type: 'water', x: 2160 },
    { type: 'coffee', x: 2280 },
    { type: 'plant', x: 2400 },
    { type: 'chair', x: 2520 },
    { type: 'desk', x: 2680 },
    { type: 'cabinet', x: 2820 },
    { type: 'plant', x: 2940 },
    { type: 'water', x: 3080 },
    { type: 'chair', x: 3220 },
    { type: 'desk', x: 3380 },
    { type: 'coffee', x: 3500 },
    { type: 'plant', x: 3640 },
    { type: 'cabinet', x: 3780 }
  ];

  props.forEach(prop => {
    const x = (prop.x - backgroundX * 0.7) % (canvas.width + 400);
    if (x < -150 || x > canvas.width + 50) return;

    switch(prop.type) {
      case 'desk':
        // Modern office desk (Slate Blue #3E4F6B)
        const deskGradient = ctx.createLinearGradient(x, GROUND_HEIGHT - 70, x, GROUND_HEIGHT - 60);
        deskGradient.addColorStop(0, '#3E4F6B');
        deskGradient.addColorStop(1, '#2F3D4F');
        ctx.fillStyle = deskGradient;
        ctx.fillRect(x, GROUND_HEIGHT - 70, 90, 12);

        // Desk highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(x, GROUND_HEIGHT - 70, 90, 3);

        // Desk legs
        ctx.fillStyle = '#0B0B0B';
        ctx.fillRect(x + 8, GROUND_HEIGHT - 58, 6, 58);
        ctx.fillRect(x + 76, GROUND_HEIGHT - 58, 6, 58);

        // Computer monitor on desk
        ctx.fillStyle = '#0B0B0B';
        ctx.fillRect(x + 35, GROUND_HEIGHT - 92, 25, 18);

        // Monitor screen (Cool Cyan glow #2F9DA3)
        const screenGrad = ctx.createLinearGradient(x + 37, GROUND_HEIGHT - 90, x + 37, GROUND_HEIGHT - 76);
        screenGrad.addColorStop(0, '#2F9DA3');
        screenGrad.addColorStop(1, '#1F7F7A');
        ctx.fillStyle = screenGrad;
        ctx.fillRect(x + 37, GROUND_HEIGHT - 90, 21, 14);

        // Screen glow
        ctx.fillStyle = 'rgba(47, 157, 163, 0.3)';
        ctx.fillRect(x + 34, GROUND_HEIGHT - 93, 27, 20);

        // Monitor stand
        ctx.fillStyle = '#0B0B0B';
        ctx.fillRect(x + 45, GROUND_HEIGHT - 74, 5, 4);
        break;

      case 'plant':
        // Modern potted plant (Muted Green #4FAF8A)
        // Pot base (Slate Blue)
        ctx.fillStyle = '#3E4F6B';
        ctx.beginPath();
        ctx.moveTo(x + 20, GROUND_HEIGHT - 40);
        ctx.lineTo(x + 15, GROUND_HEIGHT);
        ctx.lineTo(x + 45, GROUND_HEIGHT);
        ctx.lineTo(x + 40, GROUND_HEIGHT - 40);
        ctx.closePath();
        ctx.fill();

        // Pot rim (Deep Teal)
        ctx.fillStyle = '#1F7F7A';
        ctx.fillRect(x + 15, GROUND_HEIGHT - 42, 30, 4);

        // Pot highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(x + 18, GROUND_HEIGHT - 35, 8, 30);

        // Plant leaves (Muted Green with depth)
        ctx.fillStyle = '#4FAF8A';
        ctx.beginPath();
        ctx.arc(x + 30, GROUND_HEIGHT - 55, 22, 0, Math.PI * 2);
        ctx.fill();

        // Leaf highlights
        ctx.fillStyle = '#5FBF9A';
        ctx.beginPath();
        ctx.arc(x + 24, GROUND_HEIGHT - 62, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 36, GROUND_HEIGHT - 60, 14, 0, Math.PI * 2);
        ctx.fill();

        // Leaf shadows
        ctx.fillStyle = '#3F9F7A';
        ctx.beginPath();
        ctx.arc(x + 32, GROUND_HEIGHT - 48, 12, 0, Math.PI * 2);
        ctx.fill();

        // Leaf shine
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(x + 26, GROUND_HEIGHT - 64, 6, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'water':
        // Modern water cooler (Cool Cyan theme #2F9DA3)
        // Base stand
        ctx.fillStyle = '#0B0B0B';
        ctx.fillRect(x + 12, GROUND_HEIGHT - 35, 36, 35);

        // Main body gradient
        const waterGrad = ctx.createLinearGradient(x + 15, GROUND_HEIGHT - 95, x + 15, GROUND_HEIGHT - 35);
        waterGrad.addColorStop(0, '#2F9DA3');
        waterGrad.addColorStop(0.5, '#1F7F7A');
        waterGrad.addColorStop(1, '#2F9DA3');
        ctx.fillStyle = waterGrad;
        ctx.fillRect(x + 15, GROUND_HEIGHT - 95, 30, 60);

        // Water cooler highlights
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.fillRect(x + 17, GROUND_HEIGHT - 93, 8, 56);

        // Water bottle top (Muted Green)
        ctx.fillStyle = '#4FAF8A';
        ctx.beginPath();
        ctx.arc(x + 30, GROUND_HEIGHT - 95, 15, Math.PI, 0, true);
        ctx.fill();

        // Bottle shine
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(x + 26, GROUND_HEIGHT - 92, 8, 0, Math.PI * 2);
        ctx.fill();

        // Water level indicator
        ctx.fillStyle = 'rgba(79, 175, 138, 0.5)';
        ctx.fillRect(x + 18, GROUND_HEIGHT - 65, 24, 25);

        // Dispenser tap
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(x + 10, GROUND_HEIGHT - 55, 6, 8);
        break;

      case 'chair':
        // Modern office chair (Slate Blue #3E4F6B)
        // Seat
        const chairGrad = ctx.createLinearGradient(x + 15, GROUND_HEIGHT - 55, x + 15, GROUND_HEIGHT - 45);
        chairGrad.addColorStop(0, '#3E4F6B');
        chairGrad.addColorStop(1, '#2F3D4F');
        ctx.fillStyle = chairGrad;
        ctx.beginPath();
        ctx.ellipse(x + 30, GROUND_HEIGHT - 50, 22, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        // Seat highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.ellipse(x + 30, GROUND_HEIGHT - 52, 18, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Backrest
        ctx.fillStyle = '#3E4F6B';
        ctx.fillRect(x + 20, GROUND_HEIGHT - 85, 20, 35);

        // Backrest gradient
        const backGrad = ctx.createLinearGradient(x + 20, GROUND_HEIGHT - 85, x + 40, GROUND_HEIGHT - 85);
        backGrad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
        backGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
        backGrad.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
        ctx.fillStyle = backGrad;
        ctx.fillRect(x + 20, GROUND_HEIGHT - 85, 20, 35);

        // Chair post
        ctx.fillStyle = '#0B0B0B';
        ctx.fillRect(x + 28, GROUND_HEIGHT - 50, 4, 20);

        // Chair base (5-star)
        ctx.strokeStyle = '#0B0B0B';
        ctx.lineWidth = 3;
        for (let i = 0; i < 5; i++) {
          ctx.save();
          ctx.translate(x + 30, GROUND_HEIGHT - 5);
          ctx.rotate((i * Math.PI * 2) / 5);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(15, 0);
          ctx.stroke();
          // Wheels (Deep Teal accent)
          ctx.fillStyle = '#1F7F7A';
          ctx.beginPath();
          ctx.arc(15, 0, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        break;

      case 'cabinet':
        // Filing cabinet (Deep Teal)
        const cabinetGrad = ctx.createLinearGradient(x + 10, GROUND_HEIGHT - 100, x + 50, GROUND_HEIGHT - 100);
        cabinetGrad.addColorStop(0, '#1F7F7A');
        cabinetGrad.addColorStop(0.5, '#2F9DA3');
        cabinetGrad.addColorStop(1, '#1F7F7A');
        ctx.fillStyle = cabinetGrad;
        ctx.fillRect(x + 10, GROUND_HEIGHT - 100, 40, 100);

        // Cabinet highlight (left edge)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(x + 10, GROUND_HEIGHT - 100, 6, 100);

        // Drawer separators
        ctx.fillStyle = '#0B0B0B';
        for (let i = 1; i < 4; i++) {
          ctx.fillRect(x + 10, GROUND_HEIGHT - 100 + i * 25, 40, 3);
        }

        // Drawer handles (Muted Green)
        ctx.fillStyle = '#4FAF8A';
        for (let i = 0; i < 4; i++) {
          ctx.fillRect(x + 35, GROUND_HEIGHT - 90 + i * 25, 8, 3);
        }
        break;

      case 'coffee':
        // Coffee machine (Slate Blue with lights)
        // Machine body
        const coffeeGrad = ctx.createLinearGradient(x + 15, GROUND_HEIGHT - 80, x + 15, GROUND_HEIGHT);
        coffeeGrad.addColorStop(0, '#3E4F6B');
        coffeeGrad.addColorStop(1, '#2F3D4F');
        ctx.fillStyle = coffeeGrad;
        ctx.fillRect(x + 15, GROUND_HEIGHT - 80, 35, 80);

        // Machine highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(x + 15, GROUND_HEIGHT - 80, 10, 75);

        // Display screen (Cool Cyan)
        ctx.fillStyle = '#2F9DA3';
        ctx.fillRect(x + 20, GROUND_HEIGHT - 70, 25, 15);

        // Screen glow
        ctx.fillStyle = 'rgba(47, 157, 163, 0.3)';
        ctx.fillRect(x + 18, GROUND_HEIGHT - 72, 29, 19);

        // Coffee dispenser
        ctx.fillStyle = '#0B0B0B';
        ctx.fillRect(x + 25, GROUND_HEIGHT - 40, 15, 8);

        // Coffee cup (white)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(x + 26, GROUND_HEIGHT - 20, 12, 15);

        // Cup handle
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x + 39, GROUND_HEIGHT - 12, 5, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();

        // Steam (animated)
        const steamOffset = Math.sin(Date.now() / 300) * 3;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(x + 28 + steamOffset, GROUND_HEIGHT - 25, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 35 - steamOffset, GROUND_HEIGHT - 30, 2, 0, Math.PI * 2);
        ctx.fill();

        // Indicator lights (Muted Green)
        ctx.fillStyle = '#4FAF8A';
        ctx.beginPath();
        ctx.arc(x + 20, GROUND_HEIGHT - 60, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 26, GROUND_HEIGHT - 60, 2, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
  });
}

// Draw simple clouds
// Draw professional clouds with depth
function drawClouds() {
  const clouds = [
    { x: 120, y: 70, size: 1, alpha: 0.8 },
    { x: 450, y: 110, size: 0.9, alpha: 0.75 },
    { x: 780, y: 90, size: 1.1, alpha: 0.85 },
    { x: 1100, y: 75, size: 0.85, alpha: 0.7 }
  ];

  clouds.forEach(cloud => {
    const x = (cloud.x - backgroundX * 0.08) % (canvas.width + 300);
    if (x < -150 || x > canvas.width + 100) return;

    const y = cloud.y;
    const s = cloud.size;

    // Cloud shadow (depth)
    ctx.fillStyle = `rgba(200, 220, 235, ${cloud.alpha * 0.5})`;
    ctx.beginPath();
    ctx.arc(x + 3, y + 3, 32 * s, 0, Math.PI * 2);
    ctx.arc(x + 43 * s, y + 3, 38 * s, 0, Math.PI * 2);
    ctx.arc(x + 83 * s, y + 3, 32 * s, 0, Math.PI * 2);
    ctx.fill();

    // Main cloud body
    ctx.fillStyle = `rgba(255, 255, 255, ${cloud.alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, 32 * s, 0, Math.PI * 2);
    ctx.arc(x + 40 * s, y, 38 * s, 0, Math.PI * 2);
    ctx.arc(x + 80 * s, y, 32 * s, 0, Math.PI * 2);
    ctx.arc(x + 25 * s, y - 10 * s, 28 * s, 0, Math.PI * 2);
    ctx.arc(x + 55 * s, y - 8 * s, 30 * s, 0, Math.PI * 2);
    ctx.fill();

    // Cloud highlights
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, cloud.alpha + 0.2)})`;
    ctx.beginPath();
    ctx.arc(x + 15 * s, y - 5 * s, 18 * s, 0, Math.PI * 2);
    ctx.arc(x + 50 * s, y - 12 * s, 20 * s, 0, Math.PI * 2);
    ctx.fill();
  });
}

// Modern palm tree design with AAA quality
function drawModernPalmTree(x, y) {
  if (x < -120 || x > canvas.width + 120) return;

  // Trunk with gradient and texture
  const trunkGradient = ctx.createLinearGradient(x, y - 90, x + 18, y - 90);
  trunkGradient.addColorStop(0, '#6D4C41');
  trunkGradient.addColorStop(0.5, '#8D6E63');
  trunkGradient.addColorStop(1, '#6D4C41');
  ctx.fillStyle = trunkGradient;
  ctx.fillRect(x, y - 90, 18, 90);

  // Trunk highlight (light side)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.fillRect(x, y - 90, 6, 90);

  // Trunk segments for texture
  ctx.fillStyle = 'rgba(11, 11, 11, 0.2)';
  for (let i = 0; i < 6; i++) {
    ctx.fillRect(x, y - 90 + i * 15, 18, 3);
  }

  // Trunk segment highlights
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  for (let i = 0; i < 6; i++) {
    ctx.fillRect(x, y - 90 + i * 15, 18, 1);
  }

  // Palm leaves (Muted Green #4FAF8A)
  for (let i = 0; i < 8; i++) {
    ctx.save();
    ctx.translate(x + 9, y - 90);
    ctx.rotate((i * Math.PI * 2) / 8);

    // Leaf shadow
    ctx.fillStyle = 'rgba(11, 11, 11, 0.15)';
    ctx.beginPath();
    ctx.ellipse(2, -24, 8, 32, 0, 0, Math.PI * 2);
    ctx.fill();

    // Main leaf (Muted Green)
    ctx.fillStyle = '#4FAF8A';
    ctx.beginPath();
    ctx.ellipse(0, -25, 8, 32, 0, 0, Math.PI * 2);
    ctx.fill();

    // Leaf highlight
    ctx.fillStyle = '#5FBF9A';
    ctx.beginPath();
    ctx.ellipse(-2, -28, 5, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    // Leaf vein (center line)
    ctx.strokeStyle = '#3F9F7A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(0, -50);
    ctx.stroke();

    ctx.restore();
  }

  // Center crown detail
  ctx.fillStyle = '#4FAF8A';
  ctx.beginPath();
  ctx.arc(x + 9, y - 92, 12, 0, Math.PI * 2);
  ctx.fill();

  // Crown highlight
  ctx.fillStyle = '#5FBF9A';
  ctx.beginPath();
  ctx.arc(x + 7, y - 94, 8, 0, Math.PI * 2);
  ctx.fill();
}

// Draw AAA quality laptop obstacle with new color palette
function drawObstacle(obstacle) {
  const x = obstacle.x;
  const y = GROUND_HEIGHT - 80;

  // LAPTOP BASE (Slate Blue #3E4F6B)
  const baseGradient = ctx.createLinearGradient(x + 10, y + 60, x + 10, y + 75);
  baseGradient.addColorStop(0, '#3E4F6B');
  baseGradient.addColorStop(1, '#2F3D4F');
  ctx.fillStyle = baseGradient;
  ctx.fillRect(x + 10, y + 60, 80, 15);

  // Base highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.fillRect(x + 10, y + 60, 80, 3);

  // Base shadow
  ctx.fillStyle = 'rgba(11, 11, 11, 0.4)';
  ctx.fillRect(x, y + 75, 100, 3);

  // LAPTOP SCREEN BACK (Black #0B0B0B)
  ctx.fillStyle = '#0B0B0B';
  ctx.fillRect(x + 15, y - 2, 70, 67);

  // Screen bezel with gradient
  const bezelGradient = ctx.createLinearGradient(x + 15, y, x + 85, y);
  bezelGradient.addColorStop(0, '#2A2A2A');
  bezelGradient.addColorStop(0.5, '#1A1A1A');
  bezelGradient.addColorStop(1, '#2A2A2A');
  ctx.fillStyle = bezelGradient;
  ctx.fillRect(x + 18, y + 2, 64, 61);

  // SCREEN DISPLAY (Cool Cyan/Teal glow #2F9DA3)
  const screenGradient = ctx.createLinearGradient(x + 20, y + 5, x + 20, y + 60);
  screenGradient.addColorStop(0, '#2F9DA3');
  screenGradient.addColorStop(0.5, '#1F7F7A');
  screenGradient.addColorStop(1, '#2F9DA3');
  ctx.fillStyle = screenGradient;
  ctx.fillRect(x + 22, y + 6, 56, 53);

  // Screen glow effect
  ctx.fillStyle = 'rgba(47, 157, 163, 0.4)';
  ctx.fillRect(x + 18, y + 2, 64, 61);

  // Screen shine/gloss
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.fillRect(x + 22, y + 6, 28, 26);

  // Question mark on screen (pulsing)
  const pulse = Math.sin(Date.now() / 300) * 0.2 + 0.8;
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', x + 50, y + 30);

  // Question mark glow
  ctx.globalAlpha = pulse * 0.5;
  ctx.shadowColor = '#4FAF8A';
  ctx.shadowBlur = 15;
  ctx.fillText('?', x + 50, y + 30);
  ctx.restore();

  // Level indicator on screen (Muted Green #4FAF8A)
  ctx.fillStyle = '#4FAF8A';
  ctx.font = 'bold 12px Arial';
  ctx.shadowBlur = 0;
  ctx.fillText(`LEVEL ${obstacle.level + 1}`, x + 50, y + 54);

  // KEYBOARD (Slate Blue with keys)
  ctx.fillStyle = '#3E4F6B';
  ctx.fillRect(x + 18, y + 63, 64, 10);

  // Keyboard gradient
  const keyboardGrad = ctx.createLinearGradient(x + 18, y + 63, x + 18, y + 73);
  keyboardGrad.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
  keyboardGrad.addColorStop(1, 'rgba(11, 11, 11, 0.2)');
  ctx.fillStyle = keyboardGrad;
  ctx.fillRect(x + 18, y + 63, 64, 10);

  // Keyboard keys
  ctx.fillStyle = '#0B0B0B';
  for (let i = 0; i < 9; i++) {
    ctx.fillRect(x + 20 + i * 7, y + 65, 5, 6);
  }

  // Key highlights
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  for (let i = 0; i < 9; i++) {
    ctx.fillRect(x + 20 + i * 7, y + 65, 5, 2);
  }

  // Touchpad (center of base)
  ctx.fillStyle = '#2F3D4F';
  ctx.fillRect(x + 35, y + 67, 30, 7);

  // Touchpad border
  ctx.strokeStyle = '#1F7F7A';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 35, y + 67, 30, 7);

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
      console.log('🎮 Sending startVoting event for level:', obstacle.level);
      console.log('Question:', questions[obstacle.level].question);
      console.log('Options:', questions[obstacle.level].options);

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

  // Reset victory sequence flags
  victorySequenceActive = false;
  currentFlagIndex = 0;
  showingFlagText = false;
  confettiShown = false;

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

  // Ensure voting info is displayed
  const votingInfo = document.getElementById('votingInfo');
  const questionText = document.getElementById('questionText');

  if (votingInfo && questionText) {
    votingInfo.classList.add('active');
    questionText.textContent = data.question;
    startVotingTimer(data.timeLimit);
    console.log('Question displayed:', data.question);
  } else {
    console.error('Voting UI elements not found!');
  }
});

socket.on('voteUpdate', (data) => {
  document.getElementById('voteCount').textContent = `Votes: ${data.totalVotes}`;
});

socket.on('votingEnded', (result) => {
  const timestamp = new Date().toISOString();
  console.log(`\n🎯 ===== VOTING ENDED EVENT RECEIVED [${timestamp}] =====`);
  console.log('📊 Result:', result);
  console.log('📍 Current level:', currentLevel);
  console.log('❓ Question:', questions[currentLevel].question);
  console.log('🗳️ Total votes:', result.totalVotes);

  document.getElementById('votingInfo').classList.remove('active');

  const correctAnswer = questions[currentLevel].correct;
  const playerAnswer = result.winningAnswer;
  const hasVotes = result.totalVotes > 0;

  console.log('🔍 Determining correctness...');
  console.log('   - Has votes:', hasVotes);
  console.log('   - Player answer:', playerAnswer);
  console.log('   - Correct answer:', correctAnswer);

  let isCorrect;
  if (!hasVotes) {
    // No votes received - treat as correct to allow progression
    isCorrect = true;
    console.log('✅ NO VOTES - MARKING AS CORRECT TO ALLOW PROGRESSION');
  } else {
    // Check if answer matches
    isCorrect = (playerAnswer === correctAnswer);
    console.log(isCorrect ? '✅ CORRECT ANSWER' : '❌ WRONG ANSWER');
  }

  console.log('🎵 Playing sound for:', isCorrect ? 'CORRECT' : 'WRONG');

  // Play appropriate sound
  if (isCorrect) {
    playSound('correct');
    playSound('coin');
  } else {
    playSound('wrong');
  }

  console.log('🎭 Calling showExplanationModal...');
  // Show explanation modal
  showExplanationModal(isCorrect, currentLevel);
  console.log('===== VOTING ENDED HANDLER COMPLETE =====\n');
});

// Show explanation modal
function showExplanationModal(isCorrect, levelIndex) {
  console.log(`\n📋 ===== SHOW EXPLANATION MODAL =====`);
  console.log('Level:', levelIndex);
  console.log('Is correct:', isCorrect);

  const modal = document.getElementById('explanationModal');
  const question = questions[levelIndex];

  console.log('Question:', question.question);
  console.log('Correct answer:', question.correct);

  // Set result text
  const resultElement = document.getElementById('modalResult');
  if (isCorrect) {
    resultElement.textContent = '✅ CORRECT!';
    resultElement.className = 'modal-result correct';
    console.log('✅ Modal set to CORRECT');
  } else {
    resultElement.textContent = '❌ WRONG!';
    resultElement.className = 'modal-result wrong';
    console.log('❌ Modal set to WRONG');
  }

  // Set question text
  document.getElementById('modalQuestion').textContent = question.question;

  // Set correct answer
  document.getElementById('modalCorrectAnswer').textContent = question.correct;

  // Set explanation
  document.getElementById('modalExplanation').textContent = question.explanation;

  console.log('📄 Modal content populated');

  // Show modal
  modal.classList.add('active');
  console.log('🎭 Modal displayed (active class added)');
  console.log('===== SHOW EXPLANATION MODAL COMPLETE =====\n');
}

// Continue button handler
document.getElementById('continueBtn').addEventListener('click', () => {
  console.log(`\n🔘 ===== CONTINUE BUTTON CLICKED =====`);
  console.log('Current level before:', currentLevel);

  const modal = document.getElementById('explanationModal');
  modal.classList.remove('active');
  console.log('Modal closed');

  const correctAnswer = questions[currentLevel].correct;
  const wasCorrect = document.getElementById('modalResult').classList.contains('correct');

  console.log('Was correct:', wasCorrect);
  console.log('Correct answer:', correctAnswer);

  if (wasCorrect) {
    // Correct answer - continue to next level
    currentLevel++;
    console.log('✨ ADVANCING TO LEVEL:', currentLevel, '/ Total questions:', questions.length);

    if (currentLevel >= questions.length) {
      // All questions complete! Show journey start modal
      console.log('🏆 ===== ALL LEVELS COMPLETE! =====');
      console.log('🚩 Showing journey start modal...');
      gameWon = true;
      gameRunning = false;
      waitingForAnswer = false;

      // Show the journey start modal
      const journeyModal = document.getElementById('journeyStartModal');
      journeyModal.classList.add('active');
      console.log('Journey start modal displayed');
    } else {
      // Next level
      console.log('⏭️ NEXT LEVEL - Creating obstacle for level:', currentLevel);
      waitingForAnswer = false;
      gameRunning = true;
      createObstacle(currentLevel);
    }
  } else {
    // Wrong answer - lose a life
    console.log('❌ WRONG ANSWER - Losing a life');
    playerLives--;
    console.log('Lives remaining:', playerLives);

    if (playerLives <= 0) {
      // Game over - restart
      console.log('💀 GAME OVER - Restarting game');
      socket.emit('resetGame');
      currentLevel = 0;
      playerLives = 3;
      waitingForAnswer = false;
      startGame();
    } else {
      // Still have lives - continue but don't advance level
      console.log('🔄 Still have lives - Recreating same obstacle');
      waitingForAnswer = false;
      gameRunning = true;
      // Recreate the same obstacle
      obstacles = [];
      createObstacle(currentLevel);
    }
  }
  console.log('===== CONTINUE BUTTON HANDLER COMPLETE =====\n');
});

// Skip timer button
document.getElementById('skipTimerBtn').addEventListener('click', () => {
  console.log('Skip timer clicked');
  // Manually trigger end voting on server
  socket.emit('endVoting');
});

// Start Journey button
document.getElementById('startJourneyBtn').addEventListener('click', () => {
  console.log('🚀 ===== START JOURNEY BUTTON CLICKED =====');

  // Close the modal
  const journeyModal = document.getElementById('journeyStartModal');
  journeyModal.classList.remove('active');

  // Start the player-controlled journey
  victorySequenceActive = true;
  currentFlagIndex = 0;
  showingFlagText = false;
  gameRunning = true; // Enable player movement
  waitingForAnswer = false;

  // Clear all obstacles so player can move freely
  obstacles = [];

  // Reset player position if needed
  player.y = GROUND_HEIGHT - player.height;
  player.velocityY = 0;

  console.log('Journey mode activated - player can now move!');
  console.log('Use arrow keys or A/D to walk to each flag');
  console.log('First flag location:', qiyasMilestones[0].x);
  console.log('===== START JOURNEY COMPLETE =====\n');
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

// Victory screen with RETRO STYLING - Player Controlled
function drawVictoryScreen() {
  if (!victorySequenceActive) return;

  // Player-controlled journey through flags
  if (currentFlagIndex < qiyasMilestones.length) {
    const targetFlag = qiyasMilestones[currentFlagIndex];
    const targetX = targetFlag.x - backgroundX * 0.5;

    // Check if player reached the current flag (manual walking)
    if (Math.abs(player.x - targetX) < 80) {
      // Show flag text
      if (!showingFlagText) {
        showingFlagText = true;
        flagTextTimer = Date.now();
        console.log('🚩 FLAG', currentFlagIndex + 1, 'REACHED!');
        console.log('   Date:', targetFlag.date);
        console.log('   Milestone:', targetFlag.text);
        playSound('coin'); // Play sound when flag is reached
      }

      // Display text for 3 seconds, then move to next flag
      if (Date.now() - flagTextTimer > 3000) {
        showingFlagText = false;
        currentFlagIndex++;
        console.log('✅ Moving to next flag. Progress:', currentFlagIndex, '/', qiyasMilestones.length);

        // Check if all flags are complete
        if (currentFlagIndex >= qiyasMilestones.length) {
          console.log('🎉 ALL FLAGS VISITED! Showing final celebration...');
        }
      }
    }
  }

  // Draw all flags
  qiyasMilestones.forEach((milestone, index) => {
    const flagX = milestone.x - backgroundX * 0.5;
    if (flagX > -100 && flagX < canvas.width + 100) {
      // Highlight current target flag
      const isCurrentTarget = (index === currentFlagIndex && currentFlagIndex < qiyasMilestones.length);
      drawFlag(flagX, GROUND_HEIGHT, index < currentFlagIndex, isCurrentTarget);
    }
  });

  // Draw flag text when showing
  if (showingFlagText && currentFlagIndex < qiyasMilestones.length) {
    const currentMilestone = qiyasMilestones[currentFlagIndex];
    drawFlagText(currentMilestone.date, currentMilestone.text);
  }

  // Draw progress indicator
  if (currentFlagIndex < qiyasMilestones.length) {
    ctx.font = '16px "Press Start 2P", monospace';
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    ctx.fillText(`FLAGS: ${currentFlagIndex}/${qiyasMilestones.length}`, canvas.width / 2, 50);
    ctx.shadowBlur = 0;
    ctx.textAlign = 'left';
  }

  // Final celebration when all flags are reached
  if (currentFlagIndex >= qiyasMilestones.length) {
    drawFinalCelebration();
  }
}

// Draw a milestone flag
function drawFlag(x, y, reached, isCurrentTarget = false) {
  const flagHeight = 80;
  const flagWidth = 60;

  // Flag pole
  ctx.fillStyle = '#0B0B0B';
  ctx.fillRect(x - 3, y - flagHeight - 40, 6, flagHeight + 40);

  // Flag color changes based on state
  let flagColor;
  if (isCurrentTarget) {
    // Current target flag - glowing yellow/gold
    const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7;
    flagColor = `rgba(255, 215, 0, ${pulse})`;

    // Add glow effect for current target
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 20;
  } else if (reached) {
    // Already visited flag - green
    flagColor = '#4FAF8A';
  } else {
    // Not yet reached - gray
    flagColor = '#A0A0A0';
  }

  ctx.fillStyle = flagColor;

  // Waving flag animation
  const wave = Math.sin(Date.now() / 200 + x / 50) * 5;

  ctx.beginPath();
  ctx.moveTo(x, y - flagHeight - 35);
  ctx.lineTo(x + flagWidth + wave, y - flagHeight - 20);
  ctx.lineTo(x + flagWidth + wave * 1.5, y - flagHeight - 5);
  ctx.lineTo(x, y - flagHeight);
  ctx.closePath();
  ctx.fill();

  ctx.shadowBlur = 0; // Reset shadow

  // Flag border
  ctx.strokeStyle = isCurrentTarget ? '#FFD700' : '#1F7F7A';
  ctx.lineWidth = isCurrentTarget ? 3 : 2;
  ctx.stroke();

  // Flag pole top (golden)
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.arc(x, y - flagHeight - 40, 5, 0, Math.PI * 2);
  ctx.fill();

  // Add arrow pointer above current target flag
  if (isCurrentTarget) {
    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 10;
    const arrowY = y - flagHeight - 60 + Math.sin(Date.now() / 300) * 10;

    ctx.beginPath();
    ctx.moveTo(x, arrowY);
    ctx.lineTo(x - 10, arrowY - 15);
    ctx.lineTo(x + 10, arrowY - 15);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

// Draw flag milestone text
function drawFlagText(date, text) {
  const boxWidth = 600;
  const boxHeight = 180;
  const boxX = canvas.width / 2 - boxWidth / 2;
  const boxY = 150;

  // Semi-transparent background
  ctx.fillStyle = 'rgba(11, 11, 11, 0.85)';
  ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

  // Border (Deep Teal)
  ctx.strokeStyle = '#1F7F7A';
  ctx.lineWidth = 4;
  ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

  // Date header (Muted Green)
  ctx.font = 'bold 24px "Press Start 2P", monospace';
  ctx.fillStyle = '#4FAF8A';
  ctx.textAlign = 'center';
  ctx.fillText(date, canvas.width / 2, boxY + 40);

  // Description text
  ctx.font = '14px "Press Start 2P", monospace';
  ctx.fillStyle = '#FFFFFF';

  // Word wrap for description
  const words = text.split(' ');
  const lines = [];
  let currentLine = words[0];
  const maxWidth = boxWidth - 40;

  for (let i = 1; i < words.length; i++) {
    const testLine = currentLine + ' ' + words[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth) {
      lines.push(currentLine);
      currentLine = words[i];
    } else {
      currentLine = testLine;
    }
  }
  lines.push(currentLine);

  // Draw text lines
  lines.forEach((line, index) => {
    ctx.fillText(line, canvas.width / 2, boxY + 80 + index * 25);
  });

  ctx.textAlign = 'left';
}

// Draw final celebration
function drawFinalCelebration() {
  // Trigger confetti only once
  if (!confettiShown) {
    confettiShown = true;
    showConfetti();
    console.log('All flags visited! Showing confetti and final celebration');
  }

  // Semi-transparent overlay
  ctx.fillStyle = 'rgba(11, 11, 11, 0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Celebration title
  const titlePulse = Math.sin(Date.now() / 150) * 10 + 10;
  ctx.shadowColor = '#4FAF8A';
  ctx.shadowBlur = titlePulse;

  ctx.font = 'bold 48px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#4FAF8A';
  ctx.fillText('QIYAS 2026', canvas.width / 2, canvas.height / 2 - 60);

  ctx.font = 'bold 36px "Press Start 2P", monospace';
  ctx.fillStyle = '#2F9DA3';
  ctx.fillText('JOURNEY COMPLETE!', canvas.width / 2, canvas.height / 2);

  ctx.font = 'bold 24px "Press Start 2P", monospace';
  ctx.fillStyle = '#1F7F7A';
  ctx.fillText('Innovation Scale Awaits', canvas.width / 2, canvas.height / 2 + 50);

  // Play again instruction
  ctx.shadowBlur = 3;
  ctx.font = '16px "Press Start 2P", monospace';
  const playAgainPulse = Math.sin(Date.now() / 300) * 0.5 + 0.5;
  ctx.fillStyle = `rgba(255, 255, 255, ${playAgainPulse})`;
  ctx.fillText('PRESS F5 TO PLAY AGAIN', canvas.width / 2, canvas.height / 2 + 120);

  ctx.shadowBlur = 0;
  ctx.textAlign = 'left';
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
