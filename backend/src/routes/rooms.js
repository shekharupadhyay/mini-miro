import { Router } from "express";
import Room from "../models/Room.js";
import Note from "../models/Note.js";
import Shape from "../models/Shape.js";
import { requireAuth, optionalAuth } from "../middleware/auth.js";

const router = Router();

// POST /api/rooms — create a new room
router.post("/rooms", optionalAuth, async (req, res) => {
  const { name, adminName } = req.body;

  if (!name || !adminName) {
    return res.status(400).json({ error: "name and adminName are required" });
  }

  const existing = await Room.findOne({ name: name.trim() });
  if (existing) {
    return res.status(409).json({ error: "Room name already taken" });
  }

  const room = await Room.create({
    name:      name.trim(),
    adminName: adminName.trim(),
    adminId:   req.user?._id,
  });

  res.status(201).json(room);
});

// GET /api/rooms/my — get all rooms created by the logged-in user
router.get("/rooms/my", requireAuth, async (req, res) => {
  const rooms = await Room.find({ adminId: req.user._id }).sort({ createdAt: -1 });
  res.json(rooms);
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

// PATCH /api/rooms/:name — rename board (admin only)
router.patch("/rooms/:name", requireAuth, async (req, res) => {
  try {
    const room = await Room.findOne({ name: req.params.name });
    if (!room) return res.status(404).json({ error: "Room not found" });
    if (!room.adminId?.equals(req.user._id)) return res.status(403).json({ error: "Not admin" });

    const { name: newName } = req.body;
    if (!newName?.trim()) return res.status(400).json({ error: "Name required" });

    const conflict = await Room.findOne({ name: newName.trim() });
    if (conflict && !conflict._id.equals(room._id)) {
      return res.status(409).json({ error: "Name already taken" });
    }

    const oldName = room.name;
    room.name = newName.trim();
    await room.save();

    // Keep all notes and shapes linked to the new name
    await Note.updateMany({ boardId: oldName }, { boardId: newName.trim() });
    await Shape.updateMany({ boardId: oldName }, { boardId: newName.trim() });

    res.json(room);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/rooms/:name — delete board and all its content (admin only)
router.delete("/rooms/:name", requireAuth, async (req, res) => {
  try {
    const room = await Room.findOne({ name: req.params.name });
    if (!room) return res.status(404).json({ error: "Room not found" });
    if (!room.adminId?.equals(req.user._id)) return res.status(403).json({ error: "Not admin" });

    await Note.deleteMany({ boardId: req.params.name });
    await Shape.deleteMany({ boardId: req.params.name });
    await room.deleteOne();

    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
