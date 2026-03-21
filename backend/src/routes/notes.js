import { Router } from "express";
import Note from "../models/Note.js";

export default function makeNotesRouter(io) {
  const router = Router();

  // GET all notes for a board
  router.get("/boards/:boardId/notes", async (req, res) => {
    const { boardId } = req.params;
    const notes = await Note.find({ boardId }).sort({ createdAt: 1 });
    res.json(notes);
  });

  // POST create a new note
  router.post("/boards/:boardId/notes", async (req, res) => {
    const { boardId } = req.params;

    const note = await Note.create({
      boardId,
      text:  req.body.text  ?? "",
      x:     req.body.x     ?? 100,
      y:     req.body.y     ?? 100,
      w:     req.body.w     ?? 180,
      h:     req.body.h     ?? 110,
      color: req.body.color ?? "yellow",
    });

    io.to(boardId).emit("note:created", note);
    res.status(201).json(note);
  });

  // PUT update note position
  router.put("/notes/:noteId", async (req, res) => {
    const { noteId } = req.params;
    const { x, y } = req.body;

    const updated = await Note.findByIdAndUpdate(noteId, { x, y }, { new: true });
    if (!updated) return res.status(404).json({ error: "Note not found" });

    io.to(updated.boardId).emit("note:updated", { _id: noteId, x, y });
    res.json(updated);
  });

  // PATCH update note content, color, size, position, rotation, text color, font
  router.patch("/notes/:noteId", async (req, res) => {
    const { noteId } = req.params;
    const { text, color, x, y, w, h, rotation, textColor, fontFamily } = req.body;

    const update = {};
    if (text       !== undefined) update.text       = text;
    if (color      !== undefined) update.color      = color;
    if (x          !== undefined) update.x          = x;
    if (y          !== undefined) update.y          = y;
    if (w          !== undefined) update.w          = w;
    if (h          !== undefined) update.h          = h;
    if (rotation   !== undefined) update.rotation   = rotation;
    if (textColor  !== undefined) update.textColor  = textColor;
    if (fontFamily !== undefined) update.fontFamily = fontFamily;

    const updated = await Note.findByIdAndUpdate(noteId, update, { new: true });
    if (!updated) return res.status(404).json({ error: "Note not found" });

    io.to(updated.boardId).emit("note:updated", { _id: noteId, ...update });
    res.json(updated);
  });

  // DELETE note
  router.delete("/notes/:noteId", async (req, res) => {
    const { noteId } = req.params;

    const deleted = await Note.findByIdAndDelete(noteId);
    if (!deleted) return res.status(404).json({ error: "Note not found" });

    io.to(deleted.boardId).emit("note:deleted", { _id: noteId });
    res.json({ ok: true });
  });

  return router;
}