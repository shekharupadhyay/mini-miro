import { Router } from "express";
import Shape from "../models/Shape.js";

export default function makeShapesRouter(io) {
  const router = Router();

  // GET all shapes for a board
  router.get("/boards/:boardId/shapes", async (req, res) => {
    const { boardId } = req.params;
    const shapes = await Shape.find({ boardId }).sort({ createdAt: 1 });
    res.json(shapes);
  });

  // POST create a new shape
  router.post("/boards/:boardId/shapes", async (req, res) => {
    const { boardId } = req.params;

    const shape = await Shape.create({
      boardId,
      shape:    req.body.shape,
      x:        req.body.x        ?? 100,
      y:        req.body.y        ?? 100,
      w:        req.body.w        ?? 120,
      h:        req.body.h        ?? 120,
      text:     req.body.text     ?? "",
      color:    req.body.color    ?? "black",
      fillMode: req.body.fillMode ?? "none",
      ...(req.body.points !== undefined && { points: req.body.points }),
    });

    io.to(boardId).emit("shape:created", shape);
    res.status(201).json(shape);
  });

  // PATCH update shape
  router.patch("/shapes/:shapeId", async (req, res) => {
    const { shapeId } = req.params;
    const { x, y, w, h, text, color, fillMode, textColor, fontFamily, rotation, points, lineType, lineStyle } = req.body;

    const update = {};
    if (x          !== undefined) update.x          = x;
    if (y          !== undefined) update.y          = y;
    if (w          !== undefined) update.w          = w;
    if (h          !== undefined) update.h          = h;
    if (text       !== undefined) update.text       = text;
    if (color      !== undefined) update.color      = color;
    if (fillMode   !== undefined) update.fillMode   = fillMode;
    if (textColor  !== undefined) update.textColor  = textColor;
    if (fontFamily !== undefined) update.fontFamily = fontFamily;
    if (rotation   !== undefined) update.rotation   = rotation;
    if (points     !== undefined) update.points     = points;
    if (lineType   !== undefined) update.lineType   = lineType;
    if (lineStyle  !== undefined) update.lineStyle  = lineStyle;

    const updated = await Shape.findByIdAndUpdate(shapeId, update, { new: true });
    if (!updated) return res.status(404).json({ error: "Shape not found" });

    io.to(updated.boardId).emit("shape:updated", { _id: shapeId, ...update });
    res.json(updated);
  });

  // DELETE shape
  router.delete("/shapes/:shapeId", async (req, res) => {
    const { shapeId } = req.params;

    const deleted = await Shape.findByIdAndDelete(shapeId);
    if (!deleted) return res.status(404).json({ error: "Shape not found" });

    io.to(deleted.boardId).emit("shape:deleted", { _id: shapeId });
    res.json({ ok: true });
  });

  return router;
}