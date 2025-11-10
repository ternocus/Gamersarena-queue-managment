import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const queues = {};

function getQueue(game) {
  if (!queues[game]) {
    queues[game] = { currentPlayer: 0, TotalPlayers: 0 };
  }
  return queues[game];
}

// /api/queue/join?game=fs25
app.post("/api/queue/join", (req, res) => {
  const game = req.query.game;
  if (!game) return res.status(400).json({ error: "Parametro 'game' mancante" });

  const q = getQueue(game);
  q.TotalPlayers++;
  io.emit("newPlayer", { game, totalPlayers: q.TotalPlayers });
  res.json({ game, userNumber: q.TotalPlayers, currentPlayer: q.currentPlayer });
});

// /api/queue/next?game=fs25
app.post("/api/queue/next", (req, res) => {
  const game = req.query.game;
  if (!game) return res.status(400).json({ error: "Parametro 'game' mancante" });

  const q = getQueue(game);
  q.currentPlayer++;
  io.emit("queueUpdate", { game, currentPlayer: q.currentPlayer });
  res.json({ game, currentPlayer: q.currentPlayer });
});

// /api/queue/status?game=fs25
app.get("/api/queue/status", (req, res) => {
  const game = req.query.game;
  if (!game) return res.status(400).json({ error: "Parametro 'game' mancante" });

  const q = getQueue(game);
  res.json({ game, ...q });
});

// /api/queue/reset?game=fs25
app.post("/api/queue/reset", (req, res) => {
  const game = req.query.game;
  if (!game) return res.status(400).json({ error: "Parametro 'game' mancante" });

  const q = getQueue(game);
  q.currentPlayer = 0;
  q.TotalPlayers = 0;

  io.emit("resetQueue", { game, currentPlayer: 0, reset: true });
  res.json({ game, currentPlayer: 0, TotalPlayers: 0 });
});

io.on("connection", socket => {
  console.log("✅ Client connesso");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server started on port: ${PORT}`));
