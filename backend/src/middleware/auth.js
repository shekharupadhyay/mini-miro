import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer "))
    return res.status(401).json({ error: "Unauthorized" });

  try {
    const { id } = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
    const user = await User.findById(id);
    if (!user) return res.status(401).json({ error: "User not found" });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

export async function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return next();

  try {
    const { id } = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
    const user = await User.findById(id);
    req.user = user ?? undefined;
  } catch {
    // ignore invalid token — just continue as unauthenticated
  }
  next();
}
