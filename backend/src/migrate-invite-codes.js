/**
 * One-time migration: assign invite codes to all rooms that don't have one.
 * Run with:  node src/migrate-invite-codes.js
 */
import "dotenv/config";
import crypto from "crypto";
import { connectDB } from "./db.js";
import Room from "./models/Room.js";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

async function makeCode(usedCodes) {
  for (let i = 0; i < 20; i++) {
    const code = Array.from(
      { length: 6 },
      () => CHARS[crypto.randomInt(CHARS.length)]
    ).join("");
    if (!usedCodes.has(code)) return code;
  }
  throw new Error("Could not generate a unique invite code");
}

async function run() {
  await connectDB(process.env.MONGO_URI);

  const rooms = await Room.find({ inviteCode: { $in: [null, undefined, ""] } });

  if (rooms.length === 0) {
    console.log("✅ All rooms already have invite codes. Nothing to do.");
    process.exit(0);
  }

  console.log(`🔑 Assigning invite codes to ${rooms.length} room(s)...\n`);

  // Pre-load all existing codes so we don't collide
  const existing = await Room.find({ inviteCode: { $exists: true, $ne: "" } }, "inviteCode");
  const usedCodes = new Set(existing.map(r => r.inviteCode));

  for (const room of rooms) {
    const code = await makeCode(usedCodes);
    usedCodes.add(code);
    room.inviteCode = code;
    await room.save();
    console.log(`  ✓  "${room.name}"  →  ${code}`);
  }

  console.log("\n✅ Migration complete.");
  process.exit(0);
}

run().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
