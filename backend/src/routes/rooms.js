import { Router } from "express";
import crypto from "crypto";
import Room from "../models/Room.js";
import Note from "../models/Note.js";
import Shape from "../models/Shape.js";
import { requireAuth, optionalAuth } from "../middleware/auth.js";

const router = Router();

async function makeInviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = Array.from(
      { length: 6 },
      () => chars[crypto.randomInt(chars.length)]
    ).join("");
    const exists = await Room.findOne({ inviteCode: code });
    if (!exists) return code;
  }
  throw new Error("Could not generate unique invite code");
}

router.post("/rooms", optionalAuth, async (req, res) => {
  const { name, adminName } = req.body;

  if (!name || !adminName) {
    return res.status(400).json({ error: "name and adminName are required" });
  }

  const existing = await Room.findOne({ name: name.trim() });
  if (existing) {
    return res.status(409).json({ error: "Room name already taken" });
  }

  const inviteCode = await makeInviteCode();

  const room = await Room.create({
    name:       name.trim(),
    adminName:  adminName.trim(),
    adminId:    req.user?._id,
    inviteCode,
  });

  res.status(201).json(room);
});

router.get("/rooms/my", requireAuth, async (req, res) => {
  const rooms = await Room.find({
    $or: [{ adminId: req.user._id }, { members: req.user._id }],
  }).sort({ createdAt: -1 });
  res.json(rooms);
});

router.get("/rooms/code/:code", async (req, res) => {
  const room = await Room.findOne({ inviteCode: req.params.code.toUpperCase() });
  if (!room) return res.status(404).json({ error: "Invalid invite code" });
  res.json(room);
});

router.post("/rooms/:id/join", requireAuth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ error: "Room not found" });
    if (room.adminId?.equals(req.user._id)) return res.json({ ok: true });
    await Room.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { members: req.user._id } }
    );
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/rooms/:id", async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) return res.status(404).json({ error: "Room not found" });
  res.json(room);
});

router.patch("/rooms/:id", requireAuth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ error: "Room not found" });
    if (!room.adminId?.equals(req.user._id)) return res.status(403).json({ error: "Not admin" });

    const { name: newName } = req.body;
    if (!newName?.trim()) return res.status(400).json({ error: "Name required" });

    const conflict = await Room.findOne({ name: newName.trim() });
    if (conflict && !conflict._id.equals(room._id)) {
      return res.status(409).json({ error: "Name already taken" });
    }

    room.name = newName.trim();
    await room.save();

    res.json(room);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/rooms/:id", requireAuth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ error: "Room not found" });
    if (!room.adminId?.equals(req.user._id)) return res.status(403).json({ error: "Not admin" });

    const boardId = room._id.toString();
    await Note.deleteMany({ boardId });
    await Shape.deleteMany({ boardId });
    await room.deleteOne();

    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
