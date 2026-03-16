import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    name:      { type: String, required: true, unique: true, trim: true },
    adminName: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

export default mongoose.model("Room", roomSchema);
