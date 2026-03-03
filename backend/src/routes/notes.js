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

export default router;