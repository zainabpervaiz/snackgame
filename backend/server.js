// ✅ Import dependencies
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

// ✅ Load environment variables from .env file
dotenv.config();
const app = express();

// ✅ Middleware
app.use(cors()); // Allow cross-origin requests
app.use(express.json()); // Parse JSON request body

// ✅ MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ✅ Score Schema & Model
const scoreSchema = new mongoose.Schema({
  player: { type: String, required: true }, // player name
  score: { type: Number, required: true },  // player score
  date: { type: Date, default: Date.now },  // timestamp
});
const Score = mongoose.model("Score", scoreSchema);

// ✅ Route: Save score (POST)
app.post("/api/scores", async (req, res) => {
  try {
    const { player, score } = req.body;

    // Validation
    if (!player || score === undefined) {
      return res.status(400).json({ error: "Player and score are required" });
    }

    // Create new score
    const newScore = new Score({ player, score });
    await newScore.save();

    res.json(newScore);
  } catch (error) {
    console.error("Save error:", error);
    res.status(500).json({ error: "Failed to save score" });
  }
});

// ✅ Route: Get top scores (GET)
app.get("/api/scores", async (req, res) => {
  try {
    // Fetch top 10 scores (highest first)
    const scores = await Score.find().sort({ score: -1 }).limit(10);
    res.json(scores);
  } catch (error) {
    console.error("Fetch error:", error);
    res.status(500).json({ error: "Failed to fetch scores" });
  }
});

// ✅ Server start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
