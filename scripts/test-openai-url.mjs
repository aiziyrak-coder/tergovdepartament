/**
 * Verifies OpenAI SDK accepts absolute baseURL (fixes "Invalid URL" in browser).
 * Run: node scripts/test-openai-url.mjs
 */
import OpenAI from "openai";

const cases = [
  { label: "relative (broken in browser)", baseURL: "/api/openai/v1" },
  { label: "absolute (fixed)", baseURL: "http://localhost:3000/api/openai/v1" },
];

for (const { label, baseURL } of cases) {
  try {
    const client = new OpenAI({
      apiKey: "proxy",
      baseURL,
      dangerouslyAllowBrowser: true,
    });
    // SDK builds URL on first request path resolution
    await client.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: "hi" }],
    }).catch((e) => {
      // Network/auth errors are OK — we only care about Invalid URL
      if (String(e.message).includes("Invalid URL")) throw e;
    });
    console.log(`✅ ${label}: no Invalid URL error`);
  } catch (e) {
    const msg = e?.message || String(e);
    if (msg.includes("Invalid URL")) {
      console.log(`❌ ${label}: ${msg}`);
    } else {
      console.log(`✅ ${label}: no Invalid URL (got: ${msg.slice(0, 80)})`);
    }
  }
}
