import express from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

passport.use(
  new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:  process.env.CALLBACK_URL ?? "/auth/google/callback",
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
          user = await User.create({
            googleId: profile.id,
            name:     profile.displayName,
            email:    profile.emails[0].value,
            avatar:   profile.photos[0]?.value,
          });
        }
        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.CLIENT_ORIGIN}/login?error=auth_failed`,
  }),
  (req, res) => {
    const token = jwt.sign(
      { id: req.user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    const name = encodeURIComponent(req.user.name);
    const avatar = encodeURIComponent(req.user.avatar ?? "");
    res.redirect(
      `${process.env.CLIENT_ORIGIN}/login?token=${token}&name=${name}&avatar=${avatar}`
    );
  }
);

router.get("/me", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer "))
    return res.status(401).json({ error: "No token" });

  const token = authHeader.split(" ")[1];
  try {
    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    User.findById(id).then((user) => {
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json({ id: user._id, name: user.name, email: user.email, avatar: user.avatar });
    });
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

router.post("/logout", (_req, res) => res.json({ ok: true }));

export default router;
