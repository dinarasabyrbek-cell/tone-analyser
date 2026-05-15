export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: "No text provided" });
    }

    const apiKey = (process.env.OPENROUTER_API_KEY || "").trim();
    if (!apiKey) {
      return res.status(500).json({ error: "API key not configured on server" });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "anthropic/claude-sonnet-4-6",
        messages: [
          {
            role: "system",
            content:
              "You are a professional writing coach. Analyse the tone of the writing. " +
              "Respond with three sections: OVERALL TONE, WHAT'S WORKING (3 bullets), " +
              "WHAT TO CONSIDER (3 bullets). Be specific."
          },
          { role: "user", content: text }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const msg = data?.error?.message || response.statusText;
      return res.status(response.status).json({ error: msg });
    }

    const content = data.choices[0].message.content;
    return res.status(200).json({ result: content });

  } catch (err) {
    return res.status(500).json({ error: err.message || "Unexpected server error" });
  }
}
