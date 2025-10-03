const express = require("express");
const router = express.Router();
const Score = require("../models/Score");

// ✅ Add new score
router.post("/", async (req, res) => {
  try {
    const { player, score } = req.body;
    const newScore = new Score({ player, score });
    await newScore.save();
    res.status(201).json(newScore);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Fetch all scores (or top 10)
router.get("/", async (req, res) => {
  try {
    const scores = await Score.find().sort({ score: -1 }).limit(10); // highest first
    res.json(scores);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
