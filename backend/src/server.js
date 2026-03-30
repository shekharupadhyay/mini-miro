import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";
import session from "express-session";
import passport from "passport";
import { Server } from "socket.io";
import { connectDB } from "./db.js";
import makeNotesRouter  from "./routes/notes.js";
import makeShapesRouter from "./routes/shapes.js";
import roomsRouter      from "./routes/rooms.js";
import authRouter       from "./routes/auth.js";
import aiRouter         from "./routes/ai.js";

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN,
    credentials: true,
  },
});

// { boardId: { socketId: username } }
const presence = {};

function getPresenceList(boardId) {
  return Object.values(presence[boardId] ?? {});
}

io.on("connection", (socket) => {
  console.log("🟢 socket connected:", socket.id);

  let currentBoard = null;

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

    io.to(boardId).emit("presence", getPresenceList(boardId));
    console.log(`👤 ${username} joined board ${boardId}`);
  });

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

  socket.on("reaction", (data) => {
    io.to(currentBoard).emit("reaction", data);
  });

  socket.on("board:rename", ({ newName }) => {
    io.to(currentBoard).emit("board:renamed", { newName });
  });

  socket.on("board:delete", () => {
    io.to(currentBoard).emit("board:deleted");
  });

  socket.on("chat:message", ({ text }) => {
    const msg = {
      id: `${socket.id}-${Date.now()}`,
      username: presence[currentBoard]?.[socket.id] ?? "Guest",
      text,
      timestamp: Date.now(),
    };
    io.to(currentBoard).emit("chat:message", msg);
  });

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

app.use("/auth", authRouter);
app.use("/api", makeNotesRouter(io));
app.use("/api", makeShapesRouter(io));
app.use("/api", roomsRouter);
app.use("/api/ai", aiRouter);

app.get("/health", (_req, res) => {
  res.json({ ok: true, message: "Backend is running" });
});

const PORT = process.env.PORT || 5000;

await connectDB(process.env.MONGO_URI);
server.listen(PORT, () => {
  console.log(`✅ Server listening on http://localhost:${PORT}`);
});