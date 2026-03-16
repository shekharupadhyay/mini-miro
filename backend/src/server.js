import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import { connectDB } from "./db.js";
import notesRoutes from "./routes/notes.js";
import shapesRouter from "./routes/shapes.js";
import roomsRouter from "./routes/rooms.js";


const app = express();

// REST middleware
app.use(express.json());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN,
    credentials: true,
  })
);

app.use("/api", notesRoutes);
app.use("/api", shapesRouter);
app.use("/api", roomsRouter);
// health check
app.get("/health", (req, res) => {
  res.json({ ok: true, message: "Backend is running" });
});

// Create an HTTP server (Socket.IO needs this)
const server = http.createServer(app);

// Attach Socket.IO to the HTTP server
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN,
    credentials: true,
  },
});

// Socket.IO: basic connection check
io.on("connection", (socket) => {
  console.log("🟢 socket connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("🔴 socket disconnected:", socket.id);
  });
});

// Start server only after DB connects
const PORT = process.env.PORT || 5000;

await connectDB(process.env.MONGO_URI);
server.listen(PORT, () => {
  console.log(`✅ Server listening on http://localhost:${PORT}`);
});