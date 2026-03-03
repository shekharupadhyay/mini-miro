import mongoose from "mongoose";

const noteSchema = new mongoose.Schema(
  {
    boardId: { type: String, required: true, index: true },
    text: { type: String, default: "" },
    x: { type: Number, default: 100 },
    y: { type: Number, default: 100 },
    color: { type: String, default: "yellow" },
  },
  { timestamps: true }
);

export default mongoose.model("Note", noteSchema);