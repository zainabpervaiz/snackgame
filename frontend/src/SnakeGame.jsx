import React, { useState, useEffect, useCallback, useRef } from "react";
import "./SnakeGame.css";

const foodSound = new Audio("/sounds/food.mp3");
const gameOverSound = new Audio("/sounds/gameover.mp3");

const SPEED_PRESETS = {
  SLOW: 250,
  MEDIUM: 150,
  FAST: 80,
};

const SnakeGame = () => {
  const boardSize = 15;
  const initialSnake = [[7, 7]];
  const initialFood = [5, 5];
  const initialDirection = "RIGHT";

  const [snake, setSnake] = useState(initialSnake);
  const [food, setFood] = useState(initialFood);
  const [direction, setDirection] = useState(initialDirection);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(
    () => Number(localStorage.getItem("snakeHighScore")) || 0
  );
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [gameSpeed, setGameSpeed] = useState(SPEED_PRESETS.MEDIUM);
  const [speedOption, setSpeedOption] = useState("MEDIUM");

  // 🆕 Added states
  const [speedSelected, setSpeedSelected] = useState(false);
  const [readyToPlay, setReadyToPlay] = useState(false);

  const [leaderboard, setLeaderboard] = useState([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const currentDirection = useRef(initialDirection);

  const saveScoreToDB = async (player, score) => {
    try {
      await fetch("http://localhost:5000/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player, score }),
      });
    } catch (error) {
      console.error("Error saving score:", error);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/scores");
      const data = await res.json();
      setLeaderboard(data);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    }
  };

  const resetGame = useCallback(() => {
    setSnake(initialSnake);
    setFood(initialFood);
    setDirection(initialDirection);
    currentDirection.current = initialDirection;
    setScore(0);
    setIsGameOver(false);
    setIsPaused(false);
    setSpeedSelected(false);
    setReadyToPlay(false);
  }, []);

  const changeSpeed = (speedKey) => {
    setGameSpeed(SPEED_PRESETS[speedKey]);
    setSpeedOption(speedKey);
    setSpeedSelected(true); // show ready button
  };

  // 🆕 Start game after Ready clicked
  const handleReadyPlay = () => {
    setReadyToPlay(true);
    setSpeedSelected(false);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === " " && !isGameOver) {
        setIsPaused((prev) => !prev);
        return;
      }
      if (isGameOver || isPaused || !readyToPlay) return;

      let newDirection = currentDirection.current;
      if (e.key === "ArrowUp" && newDirection !== "DOWN") newDirection = "UP";
      else if (e.key === "ArrowDown" && newDirection !== "UP") newDirection = "DOWN";
      else if (e.key === "ArrowLeft" && newDirection !== "RIGHT") newDirection = "LEFT";
      else if (e.key === "ArrowRight" && newDirection !== "LEFT") newDirection = "RIGHT";

      if (newDirection !== currentDirection.current) {
        setDirection(newDirection);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isGameOver, isPaused, readyToPlay]);

  const generateNewFood = useCallback((currentSnake) => {
    let newFood;
    do {
      newFood = [
        Math.floor(Math.random() * boardSize),
        Math.floor(Math.random() * boardSize),
      ];
    } while (currentSnake.some(([x, y]) => x === newFood[0] && y === newFood[1]));
    return newFood;
  }, []);

  const checkGameOver = useCallback(
    (head) => {
      const [row, col] = head;
      if (row < 0 || row >= boardSize || col < 0 || col >= boardSize) return true;
      if (snake.some(([x, y], index) => index > 0 && x === row && y === col)) return true;
      return false;
    },
    [boardSize, snake]
  );

  useEffect(() => {
    if (isGameOver || isPaused || !readyToPlay) return;
    currentDirection.current = direction;

    const moveSnake = () => {
      setSnake((prevSnake) => {
        let newSnake = [...prevSnake];
        let head = [...newSnake[0]];

        if (direction === "UP") head[0] -= 1;
        else if (direction === "DOWN") head[0] += 1;
        else if (direction === "LEFT") head[1] -= 1;
        else if (direction === "RIGHT") head[1] += 1;

        if (checkGameOver(head)) {
          gameOverSound.play();
          setIsGameOver(true);

          if (score > highScore) {
            setHighScore(score);
            localStorage.setItem("snakeHighScore", score);
          }

          saveScoreToDB("Guest", score);
          fetchLeaderboard();
          return prevSnake;
        }

        newSnake.unshift(head);

        if (head[0] === food[0] && head[1] === food[1]) {
          foodSound.play();
          setScore((prev) => prev + 1);
          setFood(generateNewFood(newSnake));
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    };

    const interval = setInterval(moveSnake, gameSpeed);
    return () => clearInterval(interval);
  }, [direction, food, isGameOver, isPaused, readyToPlay, checkGameOver, score, highScore, generateNewFood, gameSpeed]);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const renderBoard = () => {
    let rows = [];
    for (let i = 0; i < boardSize; i++) {
      let cells = [];
      for (let j = 0; j < boardSize; j++) {
        const isHead = snake[0][0] === i && snake[0][1] === j;
        const isBody = !isHead && snake.some(([x, y]) => x === i && y === j);
        const isFood = food[0] === i && food[1] === j;

        cells.push(
          <div
            key={`${i}-${j}`}
            className={`cell ${isHead ? "snake-head" : ""} ${
              isBody ? "snake-body" : ""
            } ${isFood ? "food" : ""}`}
          ></div>
        );
      }
      rows.push(<div key={i} className="row">{cells}</div>);
    }
    return rows;
  };

  const renderOverlay = () => {
    if (isGameOver) {
      return (
        <div className="game-overlay game-over-overlay">
          <h2>GAME OVER! 💥</h2>
          <p>Final Score: {score}</p>
          <button onClick={resetGame}>New Game</button>
        </div>
      );
    }
    if (isPaused) {
      return (
        <div className="game-overlay pause-overlay">
          <h2>PAUSED ⏸️</h2>
          <p>Press SPACE to continue.</p>
        </div>
      );
    }

    // 🆕 Step 1: Speed select screen
    if (!readyToPlay && !isGameOver && !speedSelected) {
      return (
        <div className="game-overlay start-overlay">
          <h2>CHOOSE YOUR SPEED</h2>
          <div className="speed-options">
            {Object.keys(SPEED_PRESETS).map((speedKey) => (
              <button
                key={speedKey}
                className={`speed-button ${speedOption === speedKey ? "active" : ""}`}
                onClick={() => changeSpeed(speedKey)}
              >
                {speedKey}
              </button>
            ))}
          </div>
        </div>
      );
    }

    // 🆕 Step 2: Show "Ready to Play" after speed selection
    if (speedSelected && !readyToPlay) {
      return (
        <div className="game-overlay ready-overlay">
          <h2>✅ Speed selected: {speedOption}</h2>
          <button className="ready-button" onClick={handleReadyPlay}>
            🎮 Ready to Play
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="snake-game-container">
      <h1>🐍 React Snake Game</h1>
      <div className="score-container">
        <span className="score">SCORE: {score}</span>
        <span className="high-score">HIGH SCORE: {highScore}</span>
        <span className="current-speed">SPEED: {speedOption}</span>
      </div>

      <div className="leaderboard-dropdown">
        <button
          className="leaderboard-toggle"
          onClick={() => setShowLeaderboard((prev) => !prev)}
        >
          🏆 Leaderboard {showLeaderboard ? "▲" : "▼"}
        </button>

        {showLeaderboard && (
          <div className="leaderboard-content">
            <ul>
              {leaderboard.map((entry, idx) => (
                <li key={idx}>
                  {entry.player}: {entry.score}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="board-wrapper">
        <div className={`board ${isGameOver ? "board-game-over" : ""}`}>
          {renderBoard()}
        </div>
        {renderOverlay()}
      </div>

      <div className="controls-info">
        Use **Arrow Keys** to move. Press **SPACE** to pause/unpause.
      </div>
    </div>
  );
};

export default SnakeGame;
