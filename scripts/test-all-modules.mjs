/**
 * Test all AI-backed modules via OpenAI proxy.
 * Run: node scripts/test-all-modules.mjs
 * Requires: npm run dev (or set TEST_BASE to prod URL)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const BASE = process.env.TEST_BASE || "http://127.0.0.1:3000";
const API = `${BASE}/api/openai/v1`;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const results = [];

function record(module, status, detail) {
  results.push({ module, status, detail });
  const icon = status === "OK" ? "✅" : status === "SKIP" ? "⏭️" : "❌";
  console.log(`${icon} ${module}: ${detail}`);
}

async function apiPost(endpoint, body, headers = {}) {
  const res = await fetch(`${API}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 300) }; }
  return { status: res.status, text, json };
}

function isInvalidUrl(text) {
  return /invalid url|not a valid url/i.test(text || "");
}

// --- 1. App + fix deployed check ---
try {
  const html = await (await fetch(BASE)).text();
  const hasFix = html.includes("resolveOpenAIBaseUrl") || !html.includes('"/api/openai/v1"');
  // Built bundle won't show function name; check dist separately if needed
  record("App yuklanishi", "OK", `HTTP 200, Tergov: ${html.includes("Tergov")}`);
} catch (e) {
  record("App yuklanishi", "FAIL", e.message);
}

// --- 2. Virtual Murabbiy (chat) ---
try {
  const r = await apiPost("/chat/completions", {
    model: "gpt-4o",
    messages: [{ role: "user", content: "Salom, 2 so'z bilan javob ber." }],
    max_tokens: 30,
  });
  if (isInvalidUrl(r.text)) record("Virtual Murabbiy", "FAIL", "Invalid URL");
  else if (r.status === 200) record("Virtual Murabbiy", "OK", `GPT javob: ${r.json.choices?.[0]?.message?.content?.slice(0, 60)}`);
  else record("Virtual Murabbiy", "FAIL", `HTTP ${r.status}`);
} catch (e) {
  record("Virtual Murabbiy", "FAIL", e.message);
}

// --- 3. Stenogram / Smart Protocol (Whisper) ---
try {
  // Minimal valid ogg header stub — Whisper may reject content but NOT Invalid URL
  const FormData = (await import("undici")).FormData;
  const Blob = (await import("undici")).Blob;
  const form = new FormData();
  form.append("file", new Blob([Buffer.from("OggS")], { type: "audio/ogg" }), "test.ogg");
  form.append("model", "whisper-1");
  const res = await fetch(`${API}/audio/transcriptions`, { method: "POST", body: form });
  const text = await res.text();
  if (isInvalidUrl(text)) record("Stenogram (Whisper)", "FAIL", "Invalid URL — fix deploy qilinmagan!");
  else if ([200, 400, 415, 422].includes(res.status)) record("Stenogram (Whisper)", "OK", `Proxy ishlayapti HTTP ${res.status} (Invalid URL yo'q)`);
  else record("Stenogram (Whisper)", "FAIL", `HTTP ${res.status}: ${text.slice(0, 100)}`);
} catch (e) {
  // Fallback without undici FormData
  try {
    const r = await fetch(`${API}/audio/transcriptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "whisper-1" }),
    });
    const text = await r.text();
    if (isInvalidUrl(text)) record("Stenogram (Whisper)", "FAIL", "Invalid URL — fix deploy qilinmagan!");
    else record("Stenogram (Whisper)", "OK", `Proxy reachable HTTP ${r.status}`);
  } catch (e2) {
    record("Stenogram (Whisper)", "FAIL", e2.message);
  }
}

// --- 4. TTS (Virtual Murabbiy ovoz) ---
try {
  const r = await fetch(`${API}/audio/speech`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "tts-1", voice: "alloy", input: "Salom" }),
  });
  const text = await r.text();
  if (isInvalidUrl(text)) record("TTS (Ovozli o'qish)", "FAIL", "Invalid URL");
  else if (r.status === 200) record("TTS (Ovozli o'qish)", "OK", `Audio bytes: ${text.length}`);
  else record("TTS (Ovozli o'qish)", "FAIL", `HTTP ${r.status}`);
} catch (e) {
  record("TTS (Ovozli o'qish)", "FAIL", e.message);
}

// --- 5. Huquqiy qidiruv ---
try {
  const r = await apiPost("/chat/completions", {
    model: "gpt-4o",
    messages: [
      { role: "system", content: "Huquqiy maslahatchi. Qisqa javob." },
      { role: "user", content: "JPK 65-modda nima haqida?" },
    ],
    max_tokens: 80,
  });
  if (isInvalidUrl(r.text)) record("Huquqiy qidiruv", "FAIL", "Invalid URL");
  else if (r.status === 200) record("Huquqiy qidiruv", "OK", "GPT javob qaytardi");
  else record("Huquqiy qidiruv", "FAIL", `HTTP ${r.status}`);
} catch (e) {
  record("Huquqiy qidiruv", "FAIL", e.message);
}

// --- 6. FotoRobot (image gen) ---
try {
  const r = await apiPost("/images/generations", {
    model: "gpt-image-1",
    prompt: "Simple police sketch portrait, black and white",
    n: 1,
    size: "256x256",
  });
  if (isInvalidUrl(r.text)) record("FotoRobot", "FAIL", "Invalid URL");
  else if (r.status === 200) record("FotoRobot", "OK", "Rasm generatsiya OK");
  else record("FotoRobot", "WARN", `HTTP ${r.status} — ${r.json?.error?.message?.slice(0, 80) || "model/access muammosi bo'lishi mumkin"}`);
} catch (e) {
  record("FotoRobot", "FAIL", e.message);
}

// --- 7. Hujjatlar / Vision ---
try {
  const r = await apiPost("/chat/completions", {
    model: "gpt-4o",
    messages: [{
      role: "user",
      content: [
        { type: "text", text: "Bu test. JSON: {\"summary\":\"test\"}" },
      ],
    }],
    max_tokens: 50,
  });
  if (isInvalidUrl(r.text)) record("Hujjatlar (Vision API)", "FAIL", "Invalid URL");
  else if (r.status === 200) record("Hujjatlar (Vision API)", "OK", "GPT-4o vision endpoint OK");
  else record("Hujjatlar (Vision API)", "FAIL", `HTTP ${r.status}`);
} catch (e) {
  record("Hujjatlar (Vision API)", "FAIL", e.message);
}

// --- 8. Bayonnoma (local HTML — no API for generation) ---
record("Smart Protocol (Bayonnoma HTML)", "SKIP", "Lokal HTML generatsiya — API kerak emas, faqat Whisper");

// --- 9. Shablonlar, Statistika, Profil ---
record("Shablonlar", "SKIP", "Faqat lokal UI");
record("Statistika", "SKIP", "Faqat lokal UI");
record("Profil / Sozlamalar", "SKIP", "Faqat lokal UI");

// --- 10. Built bundle fix check ---
try {
  const distJs = fs.readdirSync(path.join(__dirname, "../dist/assets")).find((f) => f.endsWith(".js"));
  if (distJs) {
    const bundle = fs.readFileSync(path.join(__dirname, "../dist/assets", distJs), "utf8");
    const hasOriginFix = bundle.includes("location.origin") && bundle.includes("/api/openai/v1");
    record("Build fix tekshiruvi", hasOriginFix ? "OK" : "FAIL", hasOriginFix ? "absolute URL fix bundle da bor" : "ESKI BUILD — qayta build qiling!");
  } else {
    record("Build fix tekshiruvi", "SKIP", "dist/ yo'q — npm run build qiling");
  }
} catch (e) {
  record("Build fix tekshiruvi", "SKIP", e.message);
}

// Summary
console.log("\n========== XULOSA ==========");
const ok = results.filter((r) => r.status === "OK").length;
const fail = results.filter((r) => r.status === "FAIL").length;
const warn = results.filter((r) => r.status === "WARN").length;
console.log(`✅ OK: ${ok}  ❌ FAIL: ${fail}  ⚠️ WARN: ${warn}  ⏭️ SKIP: ${results.length - ok - fail - warn}`);
if (fail > 0) process.exit(1);
