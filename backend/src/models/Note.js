import mongoose from "mongoose";

const noteSchema = new mongoose.Schema(
  {
    boardId:    { type: String, required: true, index: true },
    text:       { type: String, default: "" },
    x:          { type: Number, default: 100 },
    y:          { type: Number, default: 100 },
    w:          { type: Number, default: 180 },
    h:          { type: Number, default: 110 },
    color:      { type: String, default: "yellow" },
    textColor:  { type: String, default: "#111318" },
    fontFamily: { type: String, default: "sans" },
  },
  { timestamps: true }
);

export default mongoose.model("Note", noteSchema);