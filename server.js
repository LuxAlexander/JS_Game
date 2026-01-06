const express = require('express');
const cors = require('cors');
const fs = require('fs');
const app = express();

app.use(cors());
app.use(express.json());

const SCORE_FILE = './scores.json';

// Get Top 10 Scores
app.get('/leaderboard', (req, res) => {
    if (!fs.existsSync(SCORE_FILE)) return res.json([]);
    const data = JSON.parse(fs.readFileSync(SCORE_FILE));
    const sorted = data.sort((a, b) => b.score - a.score).slice(0, 10);
    res.json(sorted);
});

// Submit Score
app.post('/submit-score', (req, res) => {
    const { username, score } = req.body;
    let data = [];
    if (fs.existsSync(SCORE_FILE)) {
        data = JSON.parse(fs.readFileSync(SCORE_FILE));
    }
    data.push({ name: username || 'Anonymous', score: score });
    fs.writeFileSync(SCORE_FILE, JSON.stringify(data));
    res.status(201).json({ message: "Score saved!" });
});

app.listen(3000, () => console.log('Backend running at http://localhost:3000'));