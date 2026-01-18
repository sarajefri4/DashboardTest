# 🎮 Retro Office Platformer

An interactive 2D retro-style platformer game featuring an 8-bit Arab character in traditional white thob and ghutra. The game combines classic Mario-style mechanics with an innovative real-time audience voting system for quiz-based obstacles.

## 🌟 Features

- **8-bit Arab Character**: Custom pixel-art character wearing traditional white thob and ghutra
- **Platformer Mechanics**: Mario-style left-to-right infinite scrolling gameplay
- **Interactive Quiz System**: 5 levels with quiz obstacles that require audience participation
- **Real-time Voting**: Audience members scan a QR code to vote on quiz answers
- **20-Second Timer**: Each question has a 20-second voting window
- **Majority Rules**: The most voted answer determines the player's choice
- **Victory Celebration**: Confetti animation and congratulations message upon completion
- **Beautiful Graphics**: Retro office environment with parallax scrolling backgrounds

## 🎯 Game Mechanics

1. **Player Movement**: Use arrow keys (← →) to move and spacebar to jump
2. **Obstacles**: Quiz boards appear as the player progresses
3. **Quiz Questions**: When hitting a quiz board, voting begins for the audience
4. **Voting Period**: Audience has 20 seconds to vote via their mobile devices
5. **Result**: Majority vote determines the answer
   - Correct answer: Progress to next level
   - Wrong answer: Game over and restart
6. **Win Condition**: Successfully answer all 5 questions to see the victory screen

## 📋 Quiz Questions

The game includes 5 levels with questions about Saudi Arabia:
1. Capital of Saudi Arabia
2. Number of pillars in Islam
3. Year Saudi Arabia was founded
4. Tallest building in Saudi Arabia
5. Sea to the west of Saudi Arabia

## 🚀 Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd DashboardTest
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```

   For development with auto-reload:
   ```bash
   npm run dev
   ```

4. **Access the game**
   - Main game: `http://localhost:3000/`
   - Voting page: `http://localhost:3000/vote`
   - QR code API: `http://localhost:3000/qr`

## 🎮 How to Play

### For the Game Display (Main Screen)

1. Open `http://localhost:3000/` in a browser (preferably on a large screen/projector)
2. The game will show a QR code at the bottom
3. Use arrow keys to move the character
4. When you hit a quiz obstacle, voting automatically begins
5. Wait for audience votes to determine the answer

### For Audience Members (Voters)

1. Scan the QR code displayed on the main game screen
2. Wait for questions to appear
3. Vote by tapping one of the two answer options
4. See real-time vote counts and results
5. Each person can vote once per question

## 🏗️ Project Structure

```
DashboardTest/
├── server.js           # Express + Socket.IO server
├── package.json        # Dependencies and scripts
├── public/
│   ├── game.html      # Main game interface
│   ├── game.js        # Game logic and rendering
│   ├── vote.html      # Voting interface
│   └── vote.js        # Voting logic
└── README.md          # This file
```

## 🛠️ Technology Stack

- **Backend**: Node.js, Express.js
- **Real-time Communication**: Socket.IO
- **Frontend**: HTML5 Canvas, Vanilla JavaScript
- **QR Code Generation**: qrcode library
- **Session Management**: UUID

## 🎨 Customization

### Changing Questions

Edit the `questions` array in `public/game.js`:

```javascript
const questions = [
  {
    question: "Your question here?",
    options: ["Option 1", "Option 2"],
    correct: "Option 1"
  },
  // Add more questions...
];
```

### Adjusting Timer

Change the timer duration in `server.js`:

```javascript
// Change 20000 (20 seconds) to your desired duration
setTimeout(() => {
  if (gameState.isVotingActive && gameState.currentLevel === data.level) {
    endVoting();
  }
}, 20000); // <-- Change this value (in milliseconds)
```

### Modifying Character Appearance

The character is drawn pixel-by-pixel in the `drawPlayer()` function in `public/game.js`. Modify the pixel coordinates and colors to customize the appearance.

## 🔧 Configuration

### Port Configuration

Change the port by setting the `PORT` environment variable:

```bash
PORT=8080 npm start
```

Or edit `server.js`:

```javascript
const PORT = process.env.PORT || 3000; // Change 3000 to your desired port
```

### QR Code URL

For production deployment, update the QR code URL in `server.js`:

```javascript
const voteUrl = `http://your-domain.com/vote`; // Update this
```

## 🐛 Troubleshooting

### QR Code Not Working
- Ensure your mobile device is on the same network as the server
- Use the server's IP address instead of `localhost`
- Check firewall settings

### Voting Not Updating
- Check browser console for Socket.IO connection errors
- Ensure the server is running
- Verify network connectivity

### Game Performance Issues
- Close unnecessary browser tabs
- Disable browser extensions
- Use a modern browser (Chrome, Firefox, Edge)

## 📱 Mobile Voting

The voting interface is fully responsive and optimized for mobile devices. Features include:
- Touch-friendly buttons
- Responsive design
- Real-time vote updates
- Visual feedback for vote submission
- Results display with percentage bars

## 🎉 Victory Screen

Upon completing all 5 levels:
- Confetti animation appears across the screen
- "CONGRATULATIONS!" message displays
- Game can be restarted by pressing F5

## 📝 License

MIT

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🙏 Acknowledgments

- Inspired by classic Mario platformer mechanics
- Built with modern web technologies for interactive experiences
- Designed for educational and entertainment purposes