import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    name:       { type: String, required: true, unique: true, trim: true },
    adminName:  { type: String, required: true, trim: true },
    adminId:    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    members:    [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    inviteCode: { type: String, unique: true, sparse: true, uppercase: true, trim: true },
  },
  { timestamps: true }
);

export default mongoose.model("Room", roomSchema);
