// Socket.IO connection
const socket = io();

// Generate unique voter ID
let voterId = localStorage.getItem('voterId');
if (!voterId) {
  voterId = 'voter_' + Math.random().toString(36).substr(2, 9);
  localStorage.setItem('voterId', voterId);
}

document.getElementById('voterId').textContent = voterId;

// State
let currentVote = null;
let votingActive = false;
let timerInterval = null;

// Elements
const waitingSection = document.getElementById('waitingSection');
const votingSection = document.getElementById('votingSection');
const resultSection = document.getElementById('resultSection');
const questionText = document.getElementById('questionText');
const timerDisplay = document.getElementById('timer');
const optionsContainer = document.getElementById('optionsContainer');
const statusText = document.getElementById('status');
const voteStats = document.getElementById('voteStats');

// Socket event handlers
socket.on('connect', () => {
  console.log('Connected to voting server');
  statusText.textContent = 'Connected! Waiting for questions...';
  statusText.className = 'status success';
});

socket.on('disconnect', () => {
  statusText.textContent = 'Disconnected from server';
  statusText.className = 'status error';
});

socket.on('votingStarted', (data) => {
  console.log('🗳️ ===== VOTING STARTED =====');
  console.log('Data received:', data);
  console.log('Question:', data.question);
  console.log('Options:', data.options);
  console.log('Options length:', data.options ? data.options.length : 0);
  console.log('Is text input:', data.isTextInput);

  // Reset state
  currentVote = null;
  votingActive = true;

  // Update UI
  waitingSection.style.display = 'none';
  votingSection.classList.add('active');
  resultSection.classList.remove('show');

  if (!data.question) {
    console.error('❌ ERROR: No question text provided!');
    statusText.textContent = 'Error: No question received';
    statusText.className = 'status error';
    return;
  }

  questionText.textContent = data.question;
  console.log('✅ Question text set:', questionText.textContent);

  // Create option buttons or text input
  optionsContainer.innerHTML = '';
  console.log('Options container cleared');

  // Create option buttons
  if (!data.options || data.options.length === 0) {
    console.error('❌ ERROR: No options provided!');
    statusText.textContent = 'Error: No options available';
    statusText.className = 'status error';
    return;
  }

  console.log('Creating', data.options.length, 'option buttons...');
  data.options.forEach((option, index) => {
    console.log('Creating button', index + 1, ':', option);
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = option;
    btn.onclick = () => selectOption(option);
    optionsContainer.appendChild(btn);
  });

  console.log('✅ All option buttons created');
  statusText.textContent = 'Select your answer!';
  console.log('Status text updated');

  // Start timer
  console.log('Starting timer with', data.timeLimit, 'seconds');
  startTimer(data.timeLimit);

  statusText.className = 'status';
  console.log('===== VOTING STARTED COMPLETE =====\n');
});

socket.on('votingEnded', (result) => {
  console.log('Voting ended:', result);
  votingActive = false;
  clearInterval(timerInterval);

  // Disable buttons
  const buttons = optionsContainer.querySelectorAll('.option-btn');
  buttons.forEach(btn => btn.disabled = true);

  // Show results
  displayResults(result);

  // Show waiting section after a delay
  setTimeout(() => {
    votingSection.classList.remove('active');
    resultSection.classList.remove('show');
    waitingSection.style.display = 'block';
    statusText.textContent = 'Waiting for next question...';
    statusText.className = 'status';
  }, 5000);
});

socket.on('voteUpdate', (data) => {
  // Update status with vote count
  if (votingActive && currentVote) {
    statusText.textContent = `Your vote recorded! Total votes: ${data.totalVotes}`;
    statusText.className = 'status success';
  }
});

socket.on('gameReset', () => {
  // Reset everything
  currentVote = null;
  votingActive = false;
  clearInterval(timerInterval);
  votingSection.classList.remove('active');
  resultSection.classList.remove('show');
  waitingSection.style.display = 'block';
  statusText.textContent = 'Game reset. Waiting for new game...';
  statusText.className = 'status';
});

// Select option
function selectOption(option) {
  if (!votingActive || currentVote) return;

  currentVote = option;

  // Update button states
  const buttons = optionsContainer.querySelectorAll('.option-btn');
  buttons.forEach(btn => {
    btn.classList.remove('selected');
    if (btn.textContent === option) {
      btn.classList.add('selected');
    }
  });

  // Send vote to server
  socket.emit('vote', {
    voterId: voterId,
    answer: option
  });

  statusText.textContent = `You voted for: ${option}`;
  statusText.className = 'status success';
}

// Timer
function startTimer(seconds) {
  let timeLeft = seconds;
  updateTimerDisplay(timeLeft);

  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimerDisplay(timeLeft);

    if (timeLeft <= 5) {
      timerDisplay.classList.add('urgent');
    }

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      timerDisplay.textContent = '⏰';

      if (!currentVote) {
        statusText.textContent = 'Time\'s up! You didn\'t vote.';
        statusText.className = 'status error';
      }
    }
  }, 1000);
}

function updateTimerDisplay(time) {
  timerDisplay.textContent = time;
  timerDisplay.classList.remove('urgent');
}

// Display results
function displayResults(result) {
  resultSection.classList.add('show');

  voteStats.innerHTML = '';

  if (result.totalVotes === 0) {
    voteStats.innerHTML = '<p>No votes received</p>';
    return;
  }

  // Create bars for each option that received votes
  Object.entries(result.voteCounts).forEach(([option, count]) => {
    const percentage = (count / result.totalVotes) * 100;
    const isWinner = option === result.winningAnswer;

    const barDiv = document.createElement('div');
    barDiv.className = 'vote-bar';

    const fillDiv = document.createElement('div');
    fillDiv.className = 'vote-bar-fill';
    fillDiv.style.width = percentage + '%';
    if (isWinner) {
      fillDiv.style.background = 'rgba(76, 175, 80, 0.8)';
    }

    const textDiv = document.createElement('div');
    textDiv.className = 'vote-bar-text';
    textDiv.textContent = `${option}: ${count} vote${count !== 1 ? 's' : ''} (${percentage.toFixed(1)}%) ${isWinner ? '👑' : ''}`;

    barDiv.appendChild(fillDiv);
    barDiv.appendChild(textDiv);
    voteStats.appendChild(barDiv);
  });

  if (result.winningAnswer) {
    const winnerText = document.createElement('p');
    winnerText.style.marginTop = '15px';
    winnerText.style.fontWeight = 'bold';
    winnerText.style.fontSize = '20px';
    winnerText.textContent = `Winner: ${result.winningAnswer}`;
    voteStats.appendChild(winnerText);
  }
}
