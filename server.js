import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import fetch from "node-fetch";
import csvParser from "csv-parser";

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

// /api/sheet/search?nome=Mario&cognome=Rossi
app.get("/api/sheet/search", async (req, res) => {
  const { nome, cognome } = req.query;

  if (!nome || !cognome) {
    return res.status(400).json({ error: "Parametri richiesti: nome, cognome" });
  }

  const oggi = new Date();
  const day = String(oggi.getDate()).padStart(2, "0");
  const month = String(oggi.getMonth() + 1).padStart(2, "0");
  const year = oggi.getFullYear();
  const dataOggi = `${day}/${month}/${year}`;

  try {
    const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTWjJA3OafqoG2ytwQJEUxSUypz-syfOVSJrK-pxvWmCEHjugcIxXcqI7aVhCwPQoqFL3CXY5eSQhey/pub?gid=336746532&single=true&output=csv";

    const response = await fetch(url);

    const rows = [];
    response.body
      .pipe(csvParser())
      .on("data", row => rows.push(row))
      .on("end", () => {
        const target = rows.find(r => {
          const data = r["Informazioni cronologiche"]?.trim();
          const nomeCsv = r["NOME"]?.trim().toLowerCase();
          const cognomeCsv = r["COGNOME"]?.trim().toLowerCase();

          return (
            nomeCsv === nome.trim().toLowerCase() &&
            cognomeCsv === cognome.trim().toLowerCase() &&
            data?.startsWith(dataOggi)
          );
        });

        return res.json({
          exists: !!target
        });
      })
      .on("error", err => res.status(500).json({ error: err.message }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

io.on("connection", socket => {
  console.log("✅ Client connesso");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server started on port: ${PORT}`));
