import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import { connectDB } from "./db.js";
import makeNotesRouter  from "./routes/notes.js";
import makeShapesRouter from "./routes/shapes.js";
import roomsRouter      from "./routes/rooms.js";

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: true,
    // [
    //   process.env.CLIENT_ORIGIN,
    //    "https://roni-nonhedonic-flaggingly.ngrok-free.dev"
    // ],
    credentials: true,
  })
);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN,
    credentials: true,
  },
});

// ── In-memory presence ───────────────────────────────────────────────
// { boardId: { socketId: username } }
const presence = {};

function getPresenceList(boardId) {
  return Object.values(presence[boardId] ?? {});
}

// ── Socket.IO ────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log("🟢 socket connected:", socket.id);

  let currentBoard = null;

  // ── Join room ────────────────────────────────────────────────────
  socket.on("join-board", ({ boardId, username }) => {
    if (currentBoard) {
      socket.leave(currentBoard);
      if (presence[currentBoard]) {
        delete presence[currentBoard][socket.id];
        io.to(currentBoard).emit("presence", getPresenceList(currentBoard));
      }
    }

    currentBoard = boardId;
    socket.join(boardId);

    if (!presence[boardId]) presence[boardId] = {};
    presence[boardId][socket.id] = username;

    // Emit to everyone in the room (including the joiner)
    io.to(boardId).emit("presence", getPresenceList(boardId));
    console.log(`👤 ${username} joined board ${boardId}`);
  });

  // ── Live relay — broadcast to everyone EXCEPT the sender ─────────
  // The sender already updated their own local state optimistically.
  // The server just needs to forward each event to the rest of the room.

  socket.on("note:created", (note) => {
    socket.to(currentBoard).emit("note:created", note);
  });

  socket.on("note:updated", (data) => {
    socket.to(currentBoard).emit("note:updated", data);
  });

  socket.on("note:deleted", (data) => {
    socket.to(currentBoard).emit("note:deleted", data);
  });

  socket.on("shape:created", (shape) => {
    socket.to(currentBoard).emit("shape:created", shape);
  });

  socket.on("shape:updated", (data) => {
    socket.to(currentBoard).emit("shape:updated", data);
  });

  socket.on("shape:deleted", (data) => {
    socket.to(currentBoard).emit("shape:deleted", data);
  });

  // ── Chat ──────────────────────────────────────────────────────────
  socket.on("chat:message", ({ text }) => {
    const msg = {
      id: `${socket.id}-${Date.now()}`,
      username: presence[currentBoard]?.[socket.id] ?? "Guest",
      text,
      timestamp: Date.now(),
    };
    io.to(currentBoard).emit("chat:message", msg);
  });

  // ── Disconnect ───────────────────────────────────────────────────
  socket.on("disconnect", () => {
    console.log("🔴 socket disconnected:", socket.id);
    if (currentBoard && presence[currentBoard]) {
      delete presence[currentBoard][socket.id];
      io.to(currentBoard).emit("presence", getPresenceList(currentBoard));
      if (Object.keys(presence[currentBoard]).length === 0) {
        delete presence[currentBoard];
      }
    }
  });
});

// ── REST routes ──────────────────────────────────────────────────────
app.use("/api", makeNotesRouter(io));
app.use("/api", makeShapesRouter(io));
app.use("/api", roomsRouter);

app.get("/health", (req, res) => {
  res.json({ ok: true, message: "Backend is running" });
});

const PORT = process.env.PORT || 5000;

await connectDB(process.env.MONGO_URI);
server.listen(PORT, () => {
  console.log(`✅ Server listening on http://localhost:${PORT}`);
});