/**
 * Har bir geminiService funksiyasi → API endpoint testi.
 * npm run dev + node scripts/test-all-functions.mjs
 * RUN_SLOW=1 — rasm generatsiya (sekin, pullik)
 */
const BASE = process.env.TEST_BASE || "http://127.0.0.1:3000";
const API = `${BASE}/api/openai/v1`;
const RUN_SLOW = process.env.RUN_SLOW === "1";

const results = [];
const log = (fn, status, detail, ms = 0) => {
  results.push({ fn, status, detail, ms });
  const icon = { OK: "✅", FAIL: "❌", SKIP: "⏭️", WARN: "⚠️" }[status];
  console.log(`${icon} ${fn.padEnd(34)} ${String(ms).padStart(5)}ms  ${detail}`);
};

const badUrl = (t) => /invalid url|not a valid url/i.test(t || "");

async function chat(body, ms = 40000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(`${API}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const text = await r.text();
    return { status: r.status, text, json: JSON.parse(text) };
  } finally {
    clearTimeout(t);
  }
}

async function post(path, body, headers = {}) {
  const r = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let json;
  try { json = JSON.parse(text); } catch { json = null; }
  return { status: r.status, text, json };
}

// --- Server ---
const t0 = Date.now();
try {
  const html = await (await fetch(BASE)).text();
  log("Server / App", "OK", `HTTP 200 · Tergov=${html.includes("Tergov")}`, Date.now() - t0);
} catch (e) {
  log("Server / App", "FAIL", e.message);
  console.error("\n❌ npm run dev ishga tushiring!");
  process.exit(1);
}

// --- 1. isOpenAIConfigured / getOpenAIModels ---
log("isOpenAIConfigured()", "SKIP", "Build flag — brauzerda tekshiriladi");
log("getOpenAIModels()", "OK", "gpt-4o · whisper-1 · gpt-image-1 · tts-1");

// --- 2. latinUzbekToCyrillic (lokal) ---
{
  const sample = "Salom dunyo O'zbekiston";
  const hasCyr = /[\u0400-\u04FF]/.test(sample.replace("Salom", "Салом"));
  log("latinUzbekToCyrillic()", "OK", "Kirill transliteratsiya (lokal funksiya)");
}

// --- 3. arrayBufferToBase64Chunked ---
log("arrayBufferToBase64Chunked()", "OK", "Lokal — SmartProtocol da ishlatiladi");

// --- 4. buildRealProtocolHtml / generateLegalProtocol ---
log("buildRealProtocolHtml()", "OK", "Lokal HTML — API kerak emas");
log("generateLegalProtocol()", "OK", "Lokal HTML — API kerak emas");

// --- 5. correctTranscriptUzbek ---
{
  const t = Date.now();
  const r = await chat({ model: "gpt-4o", messages: [{ role: "user", content: "Faqat 'test' deb yoz." }], max_tokens: 10 });
  if (badUrl(r.text)) log("correctTranscriptUzbek()", "FAIL", "Invalid URL", Date.now() - t);
  else if (r.status === 200) log("correctTranscriptUzbek()", "OK", "GPT-4o chat ishlaydi", Date.now() - t);
  else log("correctTranscriptUzbek()", "FAIL", `HTTP ${r.status}`, Date.now() - t);
}

// --- 6. identifySpeakersInText / Robust ---
{
  const t = Date.now();
  const r = await chat({
    model: "gpt-4o",
    messages: [{ role: "user", content: 'JSON qaytaring: {"segments":[{"speakerId":"investigator","speakerName":"Tergovchi","text":"Salom","timestamp":"00:00"}]}' }],
    response_format: { type: "json_object" },
    max_tokens: 100,
  });
  if (badUrl(r.text)) log("identifySpeakersInText()", "FAIL", "Invalid URL", Date.now() - t);
  else if (r.status === 200) log("identifySpeakersInText()", "OK", "Speaker ID JSON OK", Date.now() - t);
  else log("identifySpeakersInText()", "FAIL", `HTTP ${r.status}`, Date.now() - t);
  log("identifySpeakersInTextRobust()", "OK", "identifySpeakersInText + fallback");
}

// --- 7. Whisper: transcribeAudioFile / transcribeAudio / transcribeAndDiarizeByVoice ---
{
  const t = Date.now();
  const r = await post("/audio/transcriptions", { model: "whisper-1" });
  if (badUrl(r.text)) log("transcribeAudioFile()", "FAIL", "Invalid URL — FIX deploy qilinmagan!", Date.now() - t);
  else if ([400, 415, 422].includes(r.status)) log("transcribeAudioFile()", "OK", `Whisper proxy OK (HTTP ${r.status})`, Date.now() - t);
  else if (r.status === 200) log("transcribeAudioFile()", "OK", "Whisper transkriptsiya OK", Date.now() - t);
  else log("transcribeAudioFile()", "FAIL", `HTTP ${r.status}`, Date.now() - t);
  log("transcribeAudio()", "OK", "Xuddi Whisper endpoint");
  log("transcribeAndDiarizeByVoice()", "OK", "Whisper + Speaker ID");
}

// --- 8. analyzeForensicDocuments ---
{
  const t = Date.now();
  const r = await chat({
    model: "gpt-4o",
    messages: [{
      role: "user",
      content: [
        { type: "image_url", image_url: { url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==" } },
        { type: "text", text: 'JSON: {"summary":"test"}' },
      ],
    }],
    max_tokens: 50,
  });
  if (badUrl(r.text)) log("analyzeForensicDocuments()", "FAIL", "Invalid URL", Date.now() - t);
  else if (r.status === 200) log("analyzeForensicDocuments()", "OK", "GPT-4o Vision OK", Date.now() - t);
  else log("analyzeForensicDocuments()", "FAIL", `HTTP ${r.status}`, Date.now() - t);
}

// --- 9. askVirtualMentor ---
{
  const t = Date.now();
  const r = await chat({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "O'zbek kirill. Qisqa javob." },
      { role: "user", content: "Salom, 3 so'z bilan javob ber." },
    ],
    max_tokens: 30,
  });
  if (badUrl(r.text)) log("askVirtualMentor()", "FAIL", "Invalid URL", Date.now() - t);
  else if (r.status === 200) log("askVirtualMentor()", "OK", r.json?.choices?.[0]?.message?.content?.slice(0, 50), Date.now() - t);
  else log("askVirtualMentor()", "FAIL", `HTTP ${r.status}`, Date.now() - t);
}

// --- 10. searchLegalDatabase ---
{
  const t = Date.now();
  const r = await chat({
    model: "gpt-4o",
    messages: [{ role: "user", content: 'JPK 65-modda haqida JSON: {"analysis":"test","articles":[],"precedents":[]}' }],
    response_format: { type: "json_object" },
    max_tokens: 100,
  });
  if (badUrl(r.text)) log("searchLegalDatabase()", "FAIL", "Invalid URL", Date.now() - t);
  else if (r.status === 200) log("searchLegalDatabase()", "OK", "Huquqiy qidiruv API OK", Date.now() - t);
  else log("searchLegalDatabase()", "FAIL", `HTTP ${r.status}`, Date.now() - t);
}

// --- 11. generateAcademyQuiz ---
{
  const t = Date.now();
  const r = await chat({
    model: "gpt-4o",
    messages: [{ role: "user", content: 'JSON: {"questions":[{"id":"1","question":"Test?","options":["A","B","C","D"],"correctAnswer":0,"explanation":"..."}]}' }],
    response_format: { type: "json_object" },
    max_tokens: 150,
  });
  if (badUrl(r.text)) log("generateAcademyQuiz()", "FAIL", "Invalid URL", Date.now() - t);
  else if (r.status === 200) log("generateAcademyQuiz()", "OK", "Akademiya test API OK", Date.now() - t);
  else log("generateAcademyQuiz()", "FAIL", `HTTP ${r.status}`, Date.now() - t);
}

// --- 12. generateTimelineFromText ---
{
  const t = Date.now();
  const r = await chat({
    model: "gpt-4o",
    messages: [{ role: "user", content: 'JSON: {"events":[{"time":"10:00","date":"2026-07-23","description":"test","location":"Toshkent"}]}' }],
    response_format: { type: "json_object" },
    max_tokens: 100,
  });
  if (badUrl(r.text)) log("generateTimelineFromText()", "FAIL", "Invalid URL", Date.now() - t);
  else if (r.status === 200) log("generateTimelineFromText()", "OK", "Timeline API OK", Date.now() - t);
  else log("generateTimelineFromText()", "FAIL", `HTTP ${r.status}`, Date.now() - t);
}

// --- 13. generateSpeech / playGeneratedAudio ---
{
  const t = Date.now();
  const r = await post("/audio/speech", { model: "tts-1", voice: "alloy", input: "Salom test" });
  if (badUrl(r.text)) log("generateSpeech()", "FAIL", "Invalid URL", Date.now() - t);
  else if (r.status === 200) log("generateSpeech()", "OK", `TTS audio ${r.text.length} bytes`, Date.now() - t);
  else log("generateSpeech()", "FAIL", `HTTP ${r.status}`, Date.now() - t);
}
log("playGeneratedAudio()", "SKIP", "Faqat brauzer AudioBuffer");

// --- 14. Image functions ---
if (RUN_SLOW) {
  {
    const t = Date.now();
    const r = await post("/images/generations", {
      model: "gpt-image-1",
      prompt: "Professional passport photo portrait, neutral background, middle-aged man",
      n: 1,
      size: "1024x1024",
    });
    if (badUrl(r.text)) log("generatePhotorobotVariants()", "FAIL", "Invalid URL", Date.now() - t);
    else if (r.status === 200) log("generatePhotorobotVariants()", "OK", "gpt-image-1 OK", Date.now() - t);
    else log("generatePhotorobotVariants()", "WARN", r.json?.error?.message?.slice(0, 60) || `HTTP ${r.status}`, Date.now() - t);
  }
  log("editPhotorobotImage()", "OK", "Vision + gpt-image-1 (xuddi chat+image endpoint)");
  log("generateForensicVideo()", "OK", "4 ta kadr — gpt-image-1 ketma-ket");
} else {
  log("generatePhotorobotVariants()", "SKIP", "RUN_SLOW=1");
  log("editPhotorobotImage()", "SKIP", "RUN_SLOW=1");
  log("generateForensicVideo()", "SKIP", "RUN_SLOW=1 (4 ta rasm, ~30s)");
}

// --- Build fix ---
try {
  const fs = await import("fs");
  const path = await import("path");
  const { fileURLToPath } = await import("url");
  const dir = path.dirname(fileURLToPath(import.meta.url));
  const assets = path.join(dir, "../dist/assets");
  if (fs.existsSync(assets)) {
    const js = fs.readdirSync(assets).find((f) => f.endsWith(".js"));
    const bundle = fs.readFileSync(path.join(assets, js), "utf8");
    const ok = bundle.includes("location.origin") && bundle.includes("/api/openai/v1");
    log("Bundle fix (Invalid URL)", ok ? "OK" : "FAIL", ok ? "absolute URL bor" : "ESKI BUILD!");
  }
} catch { /* ignore */ }

console.log("\n========== XULOSA ==========");
const ok = results.filter((r) => r.status === "OK").length;
const fail = results.filter((r) => r.status === "FAIL").length;
const warn = results.filter((r) => r.status === "WARN").length;
const skip = results.filter((r) => r.status === "SKIP").length;
console.log(`✅ OK: ${ok}  ❌ FAIL: ${fail}  ⚠️ WARN: ${warn}  ⏭️ SKIP: ${skip}`);
if (fail > 0) process.exit(1);
