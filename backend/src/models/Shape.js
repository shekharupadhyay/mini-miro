import mongoose from "mongoose";

const shapeSchema = new mongoose.Schema(
  {
    boardId:    { type: String, required: true, index: true },
    shape:      { type: String, required: true }, // "rectangle" | "circle" | "triangle" | "line"
    x:          { type: Number, default: 100 },
    y:          { type: Number, default: 100 },
    w:          { type: Number, default: 120 },
    h:          { type: Number, default: 120 },
    text:       { type: String, default: "" },
    color:      { type: String, default: "black" },
    fillMode:   { type: String, default: "none" },
    textColor:  { type: String, default: null },
    fontFamily: { type: String, default: "sans" },
  },
  { timestamps: true }
);

export default mongoose.model("Shape", shapeSchema);