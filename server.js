import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const queues = {}; // { [gameName]: { currentNumber, lastNumber } }

function getQueue(game) {
  if (!queues[game]) {
    queues[game] = { currentNumber: 0, lastNumber: 0 };
  }
  return queues[game];
}

// /api/queue/join?game=fs25
app.post("/api/queue/join", (req, res) => {
  const game = req.query.game;
  if (!game) return res.status(400).json({ error: "Parametro 'game' mancante" });

  const q = getQueue(game);
  q.lastNumber++;
  res.json({ game, number: q.lastNumber, currentNumber: q.currentNumber });
});

// /api/queue/next?game=fs25
app.post("/api/queue/next", (req, res) => {
  const game = req.query.game;
  if (!game) return res.status(400).json({ error: "Parametro 'game' mancante" });

  const q = getQueue(game);
  q.currentNumber++;
  io.emit("queueUpdate", { game, currentNumber: q.currentNumber });
  res.json({ game, currentNumber: q.currentNumber });
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
  q.currentNumber = 0;
  q.lastNumber = 0;

  io.emit("queueUpdate", { game, currentNumber: 0, reset: true });
  res.json({ game, currentNumber: 0, lastNumber: 0 });
});

io.on("connection", socket => {
  console.log("✅ Client connesso");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server started on port: ${PORT}`));
