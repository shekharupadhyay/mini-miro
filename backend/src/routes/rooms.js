import { Router } from "express";
import Room from "../models/Room.js";

const router = Router();

// POST /api/rooms — create a new room
router.post("/rooms", async (req, res) => {
  const { name, adminName } = req.body;

  if (!name || !adminName) {
    return res.status(400).json({ error: "name and adminName are required" });
  }

  // Check if name is already taken
  const existing = await Room.findOne({ name: name.trim() });
  if (existing) {
    return res.status(409).json({ error: "Room name already taken" });
  }

  const room = await Room.create({
    name: name.trim(),
    adminName: adminName.trim(),
  });

  res.status(201).json(room);
});

// GET /api/rooms/:name/exists — check if a room exists
router.get("/rooms/:name/exists", async (req, res) => {
  const room = await Room.findOne({ name: req.params.name });
  res.json({ exists: !!room });
});

// GET /api/rooms/:name — get room details
router.get("/rooms/:name", async (req, res) => {
  const room = await Room.findOne({ name: req.params.name });
  if (!room) return res.status(404).json({ error: "Room not found" });
  res.json(room);
});

export default router;
