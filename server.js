const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Game state
let gameState = {
  sessionId: uuidv4(),
  currentLevel: 0,
  votes: {},
  isVotingActive: false,
  votingStartTime: null,
  questionAnswered: false
};

// Store connected voters
const voters = new Set();

// Serve static files
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'game.html'));
});

app.get('/vote', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'vote.html'));
});

app.get('/qr', async (req, res) => {
  try {
    const voteUrl = `http://localhost:${PORT}/vote`;
    const qrCode = await QRCode.toDataURL(voteUrl);
    res.json({ qrCode, url: voteUrl });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Send current game state to new connections
  socket.emit('gameState', gameState);

  // Handle game events (from game client)
  socket.on('startVoting', (data) => {
    console.log('Starting voting for level:', data.level);
    console.log('Is text input:', data.isTextInput);
    console.log('Question:', data.question);
    gameState.currentLevel = data.level;
    gameState.votes = {};
    gameState.isVotingActive = true;
    gameState.votingStartTime = Date.now();
    gameState.questionAnswered = false;

    io.emit('votingStarted', {
      level: data.level,
      question: data.question,
      options: data.options,
      timeLimit: 35,
      isTextInput: data.isTextInput || false
    });

    // Auto-end voting after 35 seconds
    setTimeout(() => {
      if (gameState.isVotingActive && gameState.currentLevel === data.level) {
        console.log('Auto-ending voting after 35 seconds for level:', data.level);
        endVoting();
      }
    }, 35000);
  });

  // Handle votes (from voting clients)
  socket.on('vote', (data) => {
    if (!gameState.isVotingActive) {
      socket.emit('voteError', { message: 'Voting is not active' });
      return;
    }

    const { voterId, answer } = data;

    // Store vote
    gameState.votes[voterId] = answer;
    voters.add(voterId);

    console.log(`Vote received: ${voterId} voted for ${answer}`);
    console.log(`Total votes: ${Object.keys(gameState.votes).length}`);

    // Broadcast vote count to all clients
    io.emit('voteUpdate', {
      totalVotes: Object.keys(gameState.votes).length,
      votes: gameState.votes
    });
  });

  // Manual end voting (if needed)
  socket.on('endVoting', () => {
    console.log('⏭️ MANUAL END VOTING called for level:', gameState.currentLevel);
    console.log('Voting active:', gameState.isVotingActive);
    console.log('Current votes:', Object.keys(gameState.votes).length);
    endVoting();
  });

  // Reset game
  socket.on('resetGame', () => {
    gameState = {
      sessionId: uuidv4(),
      currentLevel: 0,
      votes: {},
      isVotingActive: false,
      votingStartTime: null,
      questionAnswered: false
    };
    voters.clear();
    io.emit('gameReset');
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

function endVoting() {
  const timestamp = new Date().toISOString();
  console.log(`\n===== END VOTING CALLED [${timestamp}] =====`);
  console.log('Level:', gameState.currentLevel);
  console.log('Total votes received:', Object.keys(gameState.votes).length);

  gameState.isVotingActive = false;

  // Calculate majority vote
  const voteCounts = {};
  Object.values(gameState.votes).forEach(vote => {
    voteCounts[vote] = (voteCounts[vote] || 0) + 1;
  });

  console.log('Vote counts calculated:', voteCounts);

  let winningAnswer = null;
  let maxVotes = 0;

  Object.entries(voteCounts).forEach(([answer, count]) => {
    if (count > maxVotes) {
      maxVotes = count;
      winningAnswer = answer;
    }
  });

  const result = {
    winningAnswer,
    voteCounts,
    totalVotes: Object.keys(gameState.votes).length
  };

  console.log('📊 Voting ended. Result:', JSON.stringify(result, null, 2));
  console.log('🚀 Emitting votingEnded event to all clients...');

  // Send result to all clients
  io.emit('votingEnded', result);

  console.log('✅ votingEnded event emitted');
  console.log('===== END VOTING COMPLETE =====\n');

  gameState.questionAnswered = true;
}

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Game: http://localhost:${PORT}/`);
  console.log(`Voting: http://localhost:${PORT}/vote`);
});
