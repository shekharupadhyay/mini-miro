import { Router } from "express";

const router = Router();

function buildSystemPrompt(mode) {
  switch (mode) {
    case "brainstorm":
      return "You are a creative brainstorming assistant for a collaborative whiteboard. Generate diverse, actionable ideas based on the topic and board context provided. Be concise and inspiring. Format your response as a numbered list.";
    case "summarize":
      return "You are a summarization assistant for a collaborative whiteboard. Analyze the notes and shapes on the board and provide a clear, structured summary of the key themes and content.";
    case "connections":
      return "You are an analytical assistant for a collaborative whiteboard. Identify meaningful connections, relationships, and patterns between the elements on the board. Highlight how ideas relate to each other.";
    default:
      return "You are a helpful assistant for a collaborative whiteboard.";
  }
}

function buildUserPrompt(mode, prompt, notes, shapes) {
  const noteTexts = (notes || [])
    .filter((n) => n.text?.trim())
    .map((n) => `- [Note] ${n.text.trim()}`)
    .join("\n");

  const shapeTexts = (shapes || [])
    .filter((s) => s.text?.trim())
    .map((s) => `- [${s.shape}] ${s.text.trim()}`)
    .join("\n");

  const boardContext = [noteTexts, shapeTexts].filter(Boolean).join("\n");

  switch (mode) {
    case "brainstorm":
      return `Topic: ${prompt || "general ideas"}\n\n${boardContext ? `Current board content:\n${boardContext}\n\n` : ""}Generate 6-8 creative ideas related to this topic.`;
    case "summarize":
      return boardContext
        ? `Summarize the following board content into key themes and takeaways:\n${boardContext}`
        : "The board is empty. Nothing to summarize yet.";
    case "connections":
      return boardContext
        ? `Identify connections, relationships, and patterns between these board elements:\n${boardContext}`
        : "The board is empty. Add some notes or shapes first to find connections.";
    default:
      return prompt || "";
  }
}

router.post("/assist", async (req, res) => {
  const { mode, prompt, notes, shapes } = req.body;

  if (!mode) {
    return res.status(400).json({ error: "mode is required" });
  }

  const systemPrompt = buildSystemPrompt(mode);
  const userPrompt = buildUserPrompt(mode, prompt, notes, shapes);

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "meta-llama/llama-3.3-70b-instruct",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    return res.status(502).json({ error: err.error?.message || "OpenRouter request failed" });
  }

  const data = await response.json();
  const result = data.choices?.[0]?.message?.content ?? "";
  res.json({ result });
});

router.post("/refine", async (req, res) => {
  const { text, type } = req.body;

  if (!text?.trim()) {
    return res.status(400).json({ error: "No text to refine. Add some text first." });
  }

  const systemPrompt =
    "You are a text refinement assistant. Improve the provided text for clarity, grammar, and conciseness while preserving the original meaning and tone. Return only the refined text — no preamble, no explanation, no quotes.";
  const userPrompt = `Refine this ${type === "note" ? "sticky note" : "shape label"} text:\n\n${text}`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "meta-llama/llama-3.3-70b-instruct",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    return res.status(502).json({ error: err.error?.message || "OpenRouter request failed" });
  }

  const data = await response.json();
  const result = data.choices?.[0]?.message?.content ?? "";
  res.json({ result });
});

export default router;
