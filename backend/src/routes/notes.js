import { Router } from "express";
import Note from "../models/Note.js";

const router = Router();

// GET all notes for a board
router.get("/boards/:boardId/notes", async (req, res) => {
  const { boardId } = req.params;
  const notes = await Note.find({ boardId }).sort({ createdAt: 1 });
  res.json(notes);
});

// POST create a new note for a board
router.post("/boards/:boardId/notes", async (req, res) => {
  const { boardId } = req.params;

  const note = await Note.create({
    boardId,
    text: req.body.text ?? "",
    x: req.body.x ?? 100,
    y: req.body.y ?? 100,
    color: req.body.color ?? "yellow",
  });

  res.status(201).json(note);
});
router.put("/notes/:noteId", async (req, res) => {
  const { noteId } = req.params;
  const { x, y } = req.body;

  const updated = await Note.findByIdAndUpdate(
    noteId,
    { x, y },
    { new: true }
  );

  if (!updated) return res.status(404).json({ error: "Note not found" });

  res.json(updated);
});
// UPDATE note position
router.put("/notes/:id", async (req, res) => {
  const { id } = req.params;
  const { x, y } = req.body;

  const note = await Note.findByIdAndUpdate(
    id,
    { x, y },
    { new: true }
  );

  res.json(note);
});

router.patch("/notes/:noteId", async (req, res) => {
  const { noteId } = req.params;
  const { text, color } = req.body;

  const update = {};
  if (text !== undefined) update.text = text;
  if (color !== undefined) update.color = color;

  const updated = await Note.findByIdAndUpdate(noteId, update, { new: true });
  if (!updated) return res.status(404).json({ error: "Note not found" });

  res.json(updated);
});

// DELETE note
router.delete("/notes/:noteId", async (req, res) => {
  const { noteId } = req.params;

  const deleted = await Note.findByIdAndDelete(noteId);
  if (!deleted) return res.status(404).json({ error: "Note not found" });

  res.json({ ok: true });
});

export default router;