import express from "express";
import OpenAI from "openai";

const router = express.Router();

// Initialise the OpenAI client once — it reads OPENAI_API_KEY from env
const openai = new OpenAI();

/**
 * POST /api/ai/refine
 * Body: { text: string }
 * Returns: { refined: string }
 *
 * Sends the note/shape text to GPT, asks it to fix grammar and
 * make the thought clearer — no other changes.
 */
router.post("/refine", async (req, res) => {
  const { text } = req.body;

  // Basic validation
  if (!text || typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "No text provided" });
  }

  if (text.trim().length > 2000) {
    return res.status(400).json({ error: "Text too long (max 2000 chars)" });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",   // fast + cheap, perfect for this task
      messages: [
        {
          role: "system",
          content:
            "You are a writing assistant embedded in a collaborative whiteboard app. " +
            "The user will give you a short piece of text from a sticky note or shape. " +
            "Fix any grammar or spelling mistakes and make the thought clearer and more concise. " +
            "Keep the same meaning — do NOT add new ideas or change the tone dramatically. " +
            "Return ONLY the refined text, no explanation, no quotes.",
        },
        {
          role: "user",
          content: text.trim(),
        },
      ],
      max_tokens: 500,
      temperature: 0.3,   // low = more predictable, less creative
    });

    const refined = completion.choices[0].message.content.trim();
    res.json({ refined });

  } catch (err) {
    console.error("OpenAI error:", err.message);
    res.status(500).json({ error: "AI request failed" });
  }
});

export default router;
