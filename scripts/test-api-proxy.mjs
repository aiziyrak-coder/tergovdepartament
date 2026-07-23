/**
 * Integration test: OpenAI proxy via Vite dev server.
 * Run while `npm run dev` is running: node scripts/test-api-proxy.mjs
 */
const BASE = process.env.TEST_BASE || "http://127.0.0.1:3000";

async function testProxy(label, path, body) {
  const url = `${BASE}${path}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    const snippet = text.slice(0, 200).replace(/\s+/g, " ");
    console.log(`${label}: HTTP ${res.status} — ${snippet}`);
    return { ok: res.ok, status: res.status, text };
  } catch (e) {
    console.log(`${label}: FETCH ERROR — ${e.message}`);
    return { ok: false, error: e.message };
  }
}

console.log(`Testing against ${BASE}\n`);

// 1. App loads
const appRes = await fetch(BASE);
console.log(`App HTML: HTTP ${appRes.status} — title contains Tergov: ${(await appRes.text()).includes("Tergov AI")}`);

// 2. Chat API through proxy (should NOT be Invalid URL)
const chat = await testProxy("Chat proxy", "/api/openai/v1/chat/completions", {
  model: "gpt-4o",
  messages: [{ role: "user", content: "Salom, 1 so'z bilan javob ber." }],
  max_tokens: 20,
});

const invalidUrl = String(chat.text || chat.error || "").includes("Invalid URL");
console.log(invalidUrl ? "❌ Invalid URL still present" : "✅ No Invalid URL on chat proxy");

// 3. Whisper endpoint reachable (empty body → 400/415, not Invalid URL)
const whisper = await testProxy("Whisper proxy", "/api/openai/v1/audio/transcriptions", {});
const whisperInvalid = String(whisper.text || whisper.error || "").includes("Invalid URL");
console.log(whisperInvalid ? "❌ Invalid URL on whisper" : "✅ No Invalid URL on whisper proxy");

process.exit(invalidUrl || whisperInvalid ? 1 : 0);
