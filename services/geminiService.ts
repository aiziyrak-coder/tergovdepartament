import OpenAI from "openai";
import { PROTOCOL_TEMPLATES } from "../config/protocolTemplates";
import {
  ProtocolMetadata,
  MentorMode,
  ProtocolType,
  ProtocolLanguage,
  TranscriptSegment,
  TimelineEvent,
  AppLanguage,
  DialogSegment,
  DocumentAnalysisResult,
  LegalAnalysisResult,
  MentorResponse,
  QuizQuestion,
  VideoGenerationResult,
} from "../types";
import { buildRealProtocolHtml } from "./realProtocolHtml";

// API Keys — embedded at build time via Vite
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

// Default models
const TEXT_MODEL = "google/gemini-2.0-flash-001";
const AUDIO_MODEL = "whisper-large-v3";
// gemini-1.5-flash: free tier, natively supports audio (mp3, m4a, wav, ogg, flac, webm)
const GEMINI_AUDIO_MODEL = "gemini-1.5-flash";

/** Creates OpenRouter client for all text/vision/image tasks. */
function getTextClient(customKey?: string): OpenAI {
  const key = customKey?.trim() || OPENROUTER_API_KEY;
  if (!key) {
    throw new Error("❌ OpenRouter API kalit topilmadi! Sozlamalarda API key kiriting.");
  }
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: key,
    dangerouslyAllowBrowser: true,
    defaultHeaders: {
      "HTTP-Referer": "https://tergov.cdcgroup.uz",
      "X-Title": "Tergov AI Platform",
    },
  });
}

/** Creates Groq client for audio transcription (Whisper). */
function getGroqClient(): OpenAI {
  if (!GROQ_API_KEY) {
    throw new Error("❌ GROQ_API_KEY topilmadi! .env faylida GROQ_API_KEY ni sozlang.");
  }
  return new OpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey: GROQ_API_KEY,
    dangerouslyAllowBrowser: true,
  });
}

// --- HELPERS ---
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

function safeParseJson<T>(raw: string, fallback: T): T {
  try {
    const cleaned = raw.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned) as unknown;
    if (parsed === null || parsed === undefined) return fallback;
    return parsed as T;
  } catch {
    return fallback;
  }
}

/**
 * Extracts an array from a JSON response.
 * Handles both direct arrays and objects wrapping an array (e.g. {"segments":[...]}).
 */
function extractArray<T>(raw: string, fallback: T[]): T[] {
  const parsed = safeParseJson<unknown>(raw, fallback);
  if (Array.isArray(parsed)) return parsed as T[];
  if (parsed && typeof parsed === "object") {
    const values = Object.values(parsed as Record<string, unknown>);
    for (const v of values) {
      if (Array.isArray(v)) return v as T[];
    }
  }
  return fallback;
}

/** Converts base64 string to a File object for audio upload. */
function base64ToFile(base64: string, mimeType: string, filename: string): File {
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return new File([bytes], filename, { type: mimeType });
}

/**
 * Normalizes audio MIME type. Used only by the legacy base64 path (transcribeAndDiarizeByVoice).
 */
function normalizeAudioMimeType(rawMime: string): { mime: string; ext: string } {
  const base = rawMime.split(";")[0].trim().toLowerCase();
  const map: Record<string, string> = {
    "audio/webm": "webm", "audio/ogg": "ogg", "audio/opus": "opus",
    "audio/mp4": "mp4", "audio/mpeg": "mpeg", "audio/mp3": "mp3",
    "audio/wav": "wav", "audio/x-wav": "wav", "audio/wave": "wav",
    "audio/flac": "flac", "audio/x-flac": "flac",
    "audio/m4a": "mp4", "audio/x-m4a": "mp4", "audio/aac": "mp4",
    "video/mp4": "mp4", "video/webm": "webm", "video/ogg": "ogg",
    "video/quicktime": "mp4",
  };
  const ext = map[base] ?? base.split("/")[1]?.split("+")[0] ?? "webm";
  return { mime: `audio/${ext}`, ext };
}

// --- OPENROUTER AUDIO TRANSCRIPTION (Gemini via input_audio) ---

/**
 * Converts an ArrayBuffer to base64 string in chunks to avoid stack overflow
 * on large files (spread operator limit ~65535 elements).
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunkSize, bytes.length)));
  }
  return btoa(binary);
}

/** Returns the audio format string (extension) that OpenRouter's input_audio expects. */
function getAudioFormat(file: File): string {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const formatMap: Record<string, string> = {
    mp3: "mp3", mpga: "mp3", mpeg: "mp3",
    wav: "wav", wave: "wav",
    ogg: "ogg", opus: "ogg",
    flac: "flac",
    m4a: "mp4", aac: "mp4", mp4: "mp4",
    webm: "webm",
  };
  return formatMap[ext] ?? "mp4";
}

/**
 * Transcribes audio via OpenRouter using Gemini's native audio understanding.
 * OpenRouter supports the `input_audio` content type for Gemini models,
 * providing accurate Uzbek/Russian speech recognition without a separate API key.
 */
async function transcribeWithOpenRouter(
  file: File,
  lang: AppLanguage,
  apiKey: string,
): Promise<TranscriptSegment[]> {
  const buffer = await file.arrayBuffer();
  const base64Data = arrayBufferToBase64(buffer);
  const format = getAudioFormat(file);
  const isUzbek = lang !== AppLanguage.RU;

  // Ask Gemini to transcribe, diarize, AND include timestamps from the audio.
  const prompt = isUzbek
    ? `Bu o'zbek tilidagi rasmiy tergov yoki so'roq audioyozuvidir.

MUHIM QOIDALAR:
- Har bir so'zni SO'ZMA-SO'Z, ANIQ ko'chir. Hech qanday so'zni o'zgartirma, qo'shma yoki o'tkazib yubormа.
- Gapiruvchilarni OVOZI bo'yicha aniqla (tovush tembri, balandligi).
- Har bir navbat boshlanish vaqtini (MM:SS formatda) belgilа.
- "Gapiruvchi 1" = tergovchi (savol beradi), "Gapiruvchi 2" = so'roq qilinuvchi.

FAQAT quyidagi JSON formatda qaytар (boshqa hech narsa yozma, izoh ham yozma):
[
  {"speaker":"Gapiruvchi 1","text":"...","time":"00:00"},
  {"speaker":"Gapiruvchi 2","text":"...","time":"00:15"}
]`
    : `Это официальная аудиозапись допроса на русском языке.

ВАЖНЫЕ ПРАВИЛА:
- Транскрибируй ДОСЛОВНО и ТОЧНО каждое слово. Ничего не изменяй, не добавляй и не пропускай.
- Определяй говорящих по ГОЛОСУ (тембр, высота тона).
- Отмечай время начала каждой реплики (формат MM:SS).
- "Говорящий 1" = следователь (задаёт вопросы), "Говорящий 2" = допрашиваемый.

Верни ТОЛЬКО JSON-массив (без пояснений и комментариев):
[
  {"speaker":"Говорящий 1","text":"...","time":"00:00"},
  {"speaker":"Говорящий 2","text":"...","time":"00:15"}
]`;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://tergov.cdcgroup.uz",
      "X-Title": "Tergov AI Platform",
    },
    body: JSON.stringify({
      model: "google/gemini-2.0-flash-001",
      temperature: 0,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "input_audio", input_audio: { data: base64Data, format } },
        ] as unknown as string,
      }],
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`OpenRouter audio xatosi ${res.status}: ${err}`);
  }

  type ORResponse = { choices?: Array<{ message?: { content?: string } }> };
  const json = await res.json() as ORResponse;
  const raw = (json.choices?.[0]?.message?.content ?? "").trim();
  if (!raw) return [];

  // Strip markdown code fences if present, then parse JSON
  type RawSeg = { speaker?: string; text?: string; time?: string };
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  const parsed = safeParseJson<RawSeg[]>(cleaned, []);

  if (Array.isArray(parsed) && parsed.length > 0) {
    return parsed
      .filter((s) => s.text?.trim())
      .map((s, i) => ({
        id: `seg_${i + 1}`,
        speaker: s.speaker?.trim() || (isUzbek ? `Gapiruvchi ${(i % 2) + 1}` : `Говорящий ${(i % 2) + 1}`),
        text: s.text!.trim(),
        timestamp: s.time?.trim() || "",
      }));
  }

  // Fallback: return as single segment if JSON parsing fails
  return [{ id: "seg_1", speaker: isUzbek ? "Gapiruvchi 1" : "Говорящий 1", text: raw, timestamp: "00:00" }];
}

// --- WAV ENCODING (for Groq fallback compatibility) ---

function writeWavTag(view: DataView, offset: number, tag: string): void {
  for (let i = 0; i < tag.length; i++) view.setUint8(offset + i, tag.charCodeAt(i));
}

/**
 * Encodes an AudioBuffer as a 16kHz mono 16-bit PCM WAV.
 * WAV is universally accepted by Groq Whisper regardless of input codec.
 * Mono + 16kHz keeps file size ~3.8 MB / minute — well under Groq's 25 MB limit.
 */
function audioBufferToWav(buf: AudioBuffer): ArrayBuffer {
  const sr = buf.sampleRate;
  const n = buf.length;
  const nc = buf.numberOfChannels;

  // Mix all channels to mono
  const mono = new Float32Array(n);
  for (let ch = 0; ch < nc; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < n; i++) mono[i] += data[i] / nc;
  }

  const dataSize = n * 2; // 16-bit samples
  const out = new ArrayBuffer(44 + dataSize);
  const dv = new DataView(out);

  writeWavTag(dv, 0, "RIFF");  dv.setUint32(4, 36 + dataSize, true);
  writeWavTag(dv, 8, "WAVE");  writeWavTag(dv, 12, "fmt ");
  dv.setUint32(16, 16, true);   // fmt chunk size
  dv.setUint16(20, 1, true);    // PCM
  dv.setUint16(22, 1, true);    // mono
  dv.setUint32(24, sr, true);   // sample rate
  dv.setUint32(28, sr * 2, true); // byte rate
  dv.setUint16(32, 2, true);    // block align
  dv.setUint16(34, 16, true);   // bits per sample
  writeWavTag(dv, 36, "data"); dv.setUint32(40, dataSize, true);

  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, mono[i]));
    dv.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return out;
}

/**
 * Converts any browser-decodable audio file to a 16kHz mono WAV.
 * This guarantees Groq Whisper accepts it regardless of the original codec.
 */
async function convertToWav(file: File): Promise<File> {
  const raw = await file.arrayBuffer();
  const ctx = new AudioContext({ sampleRate: 16000 });
  try {
    const decoded = await ctx.decodeAudioData(raw);
    const wavData = audioBufferToWav(decoded);
    return new File([wavData], "audio.wav", { type: "audio/wav" });
  } finally {
    await ctx.close();
  }
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

// --- TIMEOUT CONSTANTS ---
const AI_CORRECTION_TIMEOUT_MS = 18000;
const AI_SPEAKER_ID_TIMEOUT_MS = 22000;
const AI_AUDIO_DIARIZATION_TIMEOUT_MS = 45000;
const LEGAL_SEARCH_TIMEOUT_MS = 35000;
const MENTOR_QUERY_TIMEOUT_MS = 40000;

// --- VIDEO GENERATION (Disabled — Veo model not available outside Google) ---
export type ForensicCameraView = "CCTV_STREET" | "DASHCAM_CAR" | "DRONE_TOP" | "WITNESS_PHONE";

export async function generateForensicVideo(
  _analysis: DocumentAnalysisResult,
  _view: ForensicCameraView | string,
  _language: AppLanguage,
  _userApiKey?: string,
): Promise<VideoGenerationResult> {
  throw new Error(
    "Video generatsiya funksiyasi hozircha mavjud emas. Ushbu funksiya Google Veo modeliga bog'liq bo'lib, keyingi versiyada qo'shiladi.",
  );
}

// --- TTS (Disabled — Gemini-specific feature) ---
export async function generateSpeech(_text: string, _userApiKey?: string): Promise<null> {
  return null;
}

export async function playGeneratedAudio(_buffer: AudioBuffer): Promise<void> {}

// --- DOCUMENT ANALYSIS (OpenRouter + Vision) ---
export async function analyzeForensicDocuments(
  files: { base64: string; mimeType: string }[],
  language: AppLanguage,
  userApiKey?: string,
): Promise<DocumentAnalysisResult> {
  const client = getTextClient(userApiKey);

  const imageContent = files.map((f) => ({
    type: "image_url" as const,
    image_url: { url: `data:${f.mimeType};base64,${f.base64}` },
  }));

  const response = await client.chat.completions.create({
    model: TEXT_MODEL,
    messages: [
      {
        role: "user",
        content: [
          ...imageContent,
          {
            type: "text",
            text: `Analyze these forensic documents/images. Return ONLY a JSON object with these exact fields:
{"summary":"...","vehicle1Type":"...","vehicle2Type":"...","estimatedSpeedV1":"...","estimatedSpeedV2":"...","weather":"...","timeOfDay":"..."}
Language: ${language}`,
          },
        ],
      },
    ],
    response_format: { type: "json_object" },
  });

  const jsonText = response.choices[0]?.message?.content ?? "{}";
  try {
    const parsed = JSON.parse(jsonText) as DocumentAnalysisResult;
    return {
      summary: String(parsed?.summary ?? ""),
      vehicle1Type: String(parsed?.vehicle1Type ?? ""),
      vehicle2Type: String(parsed?.vehicle2Type ?? ""),
      estimatedSpeedV1: String(parsed?.estimatedSpeedV1 ?? ""),
      estimatedSpeedV2: String(parsed?.estimatedSpeedV2 ?? ""),
      weather: String(parsed?.weather ?? ""),
      timeOfDay: String(parsed?.timeOfDay ?? ""),
    };
  } catch {
    throw new Error("Tahlil natijasi o'qilishi mumkin emas. Qayta urinib ko'ring.");
  }
}

// --- TRANSCRIPT CORRECTION ---
/**
 * Fixes speech-recognition errors in Uzbek interrogation transcript.
 * Normalizes spelling and fixes common mishearing, keeping legal context.
 */
export async function correctTranscriptUzbek(text: string, userApiKey?: string): Promise<string> {
  if (!text.trim()) return text;
  try {
    const client = getTextClient(userApiKey);
    const result = await withTimeout(
      client.chat.completions.create({
        model: TEXT_MODEL,
        messages: [
          {
            role: "user",
            content: `Vazifa: Tergov stenogrammasining ovozni tanlash natijasidagi xatolarni tuzating. Faqat to'g'rilangan matnni qaytaring, hech qanday izoh yozmang.

Tuzatish qoidalari:
1) Imlo: o'zbek lotin (o', g', sh, ch, ng) — "qayerda", "ko'rdim", "tushundim", "huquq", "modda".
2) Ovoz tanlash xatolari: o'xshash tovushlarni to'g'ri so'zga almashtiring.
3) Shovqin va ortiqcha: mazmunsiz qismlarni olib tashlang; faqat mantiqiy gap va so'zlarni qoldiring.
4) Saqlang: huquqiy atamalar (JPK, modda, ayblov, guvoh), joy/ismlar, sanalar.
5) Gap mazmuni o'zgarmasin: so'z tartibi va ma'no bir xil qolsin.
6) Agar matn allaqachon to'g'ri bo'lsa, o'zgartirmasdan qaytaring.

Matn:
"""
${text}
"""`,
          },
        ],
      }).then((r) => (r.choices[0]?.message?.content ?? "").trim()),
      AI_CORRECTION_TIMEOUT_MS,
      "",
    );
    return result || text;
  } catch {
    return text;
  }
}

// --- SPEAKER IDENTIFICATION ---
/**
 * Splits transcript text into segments and assigns speaker by dialog content.
 * Investigator = questions/procedural language; suspect = answers/testimony.
 */
export async function identifySpeakersInText(
  text: string,
  lastSpeakerId: "investigator" | "suspect",
  secondRoleName: string,
  userApiKey?: string,
): Promise<DialogSegment[]> {
  const client = getTextClient(userApiKey);

  const response = await client.chat.completions.create({
    model: TEXT_MODEL,
    messages: [
      {
        role: "user",
        content: `Вазифа: Қуйидаги матнни фақат КИМ ГАПИРГАНИНИ белгилаш — матнни ўзгартирманг.

ҚАТЪИЙ ТАЛАБЛАР:
1) Ҳар бир сегментдаги "text" майдони юқоридаги матндан АЁН нусха бўлиши керак.
2) Терговчи (investigator): саволлар, расмий сўзлар. ${secondRoleName} (suspect): жавоблар, баённомалар.
3) Биттта гапирувчининг кетма-кет сўзлари = биттта сегмент.
4) Олдинги охирги гапирувчи: ${lastSpeakerId}.

КИРУВЧИ МАТН:
"""
${text}
"""

Фақат JSON объект қайтаринг: {"segments":[{"speakerId":"investigator"|"suspect","speakerName":"Терговчи"|"${secondRoleName}","text":"...","timestamp":"00:00"}]}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  return extractArray<DialogSegment>(content, []);
}

/**
 * Robust speaker identification with timeout and fallback.
 * Validates that AI output text matches original (no hallucinated content).
 */
export async function identifySpeakersInTextRobust(
  text: string,
  lastSpeakerId: "investigator" | "suspect",
  secondRoleName: string,
  userApiKey?: string,
): Promise<DialogSegment[]> {
  const trimmed = text.trim();
  const fallbackSegment: DialogSegment = {
    speakerId: lastSpeakerId,
    speakerName: lastSpeakerId === "investigator" ? "Tergovchi" : secondRoleName,
    text: trimmed,
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
  try {
    const segments = await withTimeout(
      identifySpeakersInText(trimmed, lastSpeakerId, secondRoleName, userApiKey),
      AI_SPEAKER_ID_TIMEOUT_MS,
      [fallbackSegment],
    );
    if (segments.length === 0) return [fallbackSegment];
    const combined = segments.map((s) => (s.text ?? "").trim()).join(" ");
    const origNorm = trimmed.replace(/\s+/g, " ").trim();
    const combinedNorm = combined.replace(/\s+/g, " ").trim();
    const matches =
      combinedNorm === origNorm ||
      (combinedNorm.length >= origNorm.length * 0.95 &&
        combinedNorm.length <= origNorm.length * 1.05);
    return matches ? segments : [fallbackSegment];
  } catch {
    return [fallbackSegment];
  }
}

// --- AUDIO TRANSCRIPTION (Groq Whisper) ---
function getLangCode(lang: AppLanguage): string {
  switch (lang) {
    case AppLanguage.UZ_CYRL:
    case AppLanguage.UZ_LATN:
      return "uz";
    case AppLanguage.RU:
      return "ru";
    default:
      return "uz";
  }
}

function getLangLabel(lang: AppLanguage): string {
  switch (lang) {
    case AppLanguage.UZ_CYRL:
      return "o'zbek (kirill)";
    case AppLanguage.UZ_LATN:
      return "o'zbek (lotin)";
    case AppLanguage.RU:
      return "rus";
    default:
      return "o'zbek";
  }
}

/**
 * Transcribes audio and identifies speakers by voice using Groq Whisper,
 * then applies text-based speaker diarization via OpenRouter.
 */
export async function transcribeAndDiarizeByVoice(
  audioBase64: string,
  mimeType: string,
  lastSpeakerId: "investigator" | "suspect",
  secondRoleName: string,
  userApiKey?: string,
): Promise<DialogSegment[]> {
  if (!audioBase64?.trim()) return [];
  try {
    const { ext } = normalizeAudioMimeType(mimeType);
    const audioFile = base64ToFile(audioBase64, `audio/${ext}`, `audio.${ext}`);

    const transcriptionRaw = await withTimeout(
      (async () => {
        const fd = new FormData();
        fd.append("file", audioFile, audioFile.name);
        fd.append("model", AUDIO_MODEL);
        fd.append("language", getLangCode(AppLanguage.UZ_LATN));
        fd.append("response_format", "json");
        const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${GROQ_API_KEY}` },
          body: fd,
        });
        if (!res.ok) throw new Error(`Groq ${res.status}`);
        return res.json() as Promise<{ text?: string }>;
      })(),
      AI_AUDIO_DIARIZATION_TIMEOUT_MS,
      null,
    );

    const transcribedText = (transcriptionRaw as { text?: string } | null)?.text ?? "";
    if (!transcribedText.trim()) return [];

    return identifySpeakersInTextRobust(transcribedText, lastSpeakerId, secondRoleName, userApiKey);
  } catch {
    return [];
  }
}

// --- LEGAL PROTOCOL GENERATION ---
export interface ProtocolTemplateDetails {
  title: string;
  code: string;
  role: string;
  legalInfo: string;
}

/** Generates a legal protocol document (HTML for Word) in official interrogation protocol format. */
export async function generateLegalProtocol(
  _type: string,
  transcript: DialogSegment[],
  template: ProtocolType,
  metadata: ProtocolMetadata | Record<string, unknown>,
  _lang: ProtocolLanguage,
  _appLang: AppLanguage,
  _userApiKey?: string,
  templateDetails?: ProtocolTemplateDetails,
): Promise<string> {
  const templateEntry =
    templateDetails ?? PROTOCOL_TEMPLATES[template] ?? PROTOCOL_TEMPLATES[ProtocolType.GUVOH];
  return buildRealProtocolHtml(templateEntry, metadata, transcript, { useCyrillicTitle: true });
}

// --- PHOTOROBOT IMAGE GENERATION (DALL-E via OpenRouter) ---
/** Fetches an image from Pollinations.ai and returns it as a base64 data URL. */
async function pollinationsImage(prompt: string): Promise<string> {
  const seed = Math.floor(Math.random() * 9_000_000) + 1_000_000;
  const url =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?width=1024&height=1024&seed=${seed}&nologo=true&enhance=true&model=flux`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Pollinations ${res.status}: ${res.statusText}`);

  const blob = await res.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Generates photorobot image variants using Pollinations.ai — free, no API key required.
 * Images are fully fetched and converted to base64 before returning,
 * so they display immediately without additional loading.
 */
export async function generatePhotorobotVariants(
  prompt: string,
  count: number,
  _type: "HUMAN" | "OBJECT",
  _userApiKey?: string,
): Promise<string[]> {
  const actualCount = Math.max(1, Math.min(count, 4));
  const fullPrompt =
    `Forensic identification portrait, photorealistic: ${prompt}. ` +
    `Sharp facial details, neutral solid white background, professional studio lighting.`;

  // Fetch all variants in parallel — each takes ~20-40s, parallel = same total wait
  const settled = await Promise.allSettled(
    Array.from({ length: actualCount }, () => pollinationsImage(fullPrompt)),
  );

  const images = settled
    .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
    .map((r) => r.value);

  if (images.length === 0) {
    throw new Error(
      "Rasm yaratilmadi. Pollinations.ai xizmatiga ulanib bo'lmadi. Internet aloqasini tekshiring.",
    );
  }
  return images;
}

/**
 * Edits a photorobot image: uses vision LLM to describe the current image,
 * merges edit instructions, then re-generates via Pollinations.ai.
 */
export async function editPhotorobotImage(
  imageUrl: string,
  editInstruction: string,
  userApiKey?: string,
): Promise<string> {
  const client = getTextClient(userApiKey);

  // Use vision to get a detailed description of the current portrait
  const descResponse = await client.chat.completions.create({
    model: TEXT_MODEL,
    messages: [{
      role: "user",
      content: [
        { type: "image_url", image_url: { url: imageUrl } },
        {
          type: "text",
          text: `This is a forensic photorobot portrait. Describe this person's appearance in full detail (face shape, skin tone, eyes, nose, hair, beard, clothing, etc.). Then incorporate this change: "${editInstruction}". Return ONLY JSON: {"fullDescription":"complete updated portrait description in English"}`,
        },
      ],
    }],
    response_format: { type: "json_object" },
  });

  const desc = safeParseJson<{ fullDescription?: string }>(
    descResponse.choices[0]?.message?.content ?? "{}", {},
  );
  const finalPrompt = desc.fullDescription || editInstruction;

  // Re-generate with the updated description via Pollinations.ai and return as base64
  return pollinationsImage(
    `Forensic identification portrait: ${finalPrompt}. Realistic, neutral white background, photorealistic, sharp details.`,
  );
}

// --- VIRTUAL MENTOR ---
export interface MentorTurn {
  role: "user" | "model";
  content: string;
}

export async function askVirtualMentor(
  query: string,
  history: MentorTurn[],
  _mode: MentorMode,
  systemInstruction: string,
  _lang: AppLanguage,
  userApiKey?: string,
): Promise<MentorResponse> {
  const fallback: MentorResponse = {
    text: "Javob vaqti tugadi. Qayta so'rang.",
    feedback: "",
    suggestion: "",
  };
  try {
    const client = getTextClient(userApiKey);
    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: systemInstruction },
      ...history.map((h) => ({
        role: (h.role === "model" ? "assistant" : "user") as "user" | "assistant",
        content: h.content,
      })),
      { role: "user", content: query },
    ];

    const result = await withTimeout(
      client.chat.completions
        .create({ model: TEXT_MODEL, messages })
        .then((r) => r.choices[0]?.message?.content ?? ""),
      MENTOR_QUERY_TIMEOUT_MS,
      "",
    );
    return { text: result || fallback.text, feedback: "", suggestion: "" };
  } catch {
    return fallback;
  }
}

// --- LEGAL SEARCH ---
export async function searchLegalDatabase(
  query: string,
  lang: AppLanguage = AppLanguage.UZ_LATN,
  userApiKey?: string,
): Promise<LegalAnalysisResult> {
  const fallback: LegalAnalysisResult = {
    analysis: "Qidiruv vaqti tugadi yoki tarmoq xatosi. Qayta urinib ko'ring.",
    articles: [],
    precedents: [],
  };
  try {
    const client = getTextClient(userApiKey);
    const response = await withTimeout(
      client.chat.completions
        .create({
          model: TEXT_MODEL,
          messages: [
            {
              role: "user",
              content: `Search for legal information regarding: "${query}". Language: ${lang}.
Return ONLY a JSON object:
{"analysis":"detailed legal analysis in ${lang}","articles":[{"code":"...","number":"...","title":"...","summary":"..."}],"precedents":[{"source":"...","title":"...","link":"..."}]}`,
            },
          ],
          response_format: { type: "json_object" },
        })
        .then((r) => r.choices[0]?.message?.content ?? "{}"),
      LEGAL_SEARCH_TIMEOUT_MS,
      "{}",
    );
    const parsed = safeParseJson<LegalAnalysisResult>(response, {
      analysis: "",
      articles: [],
      precedents: [],
    });
    return {
      analysis: String(parsed.analysis ?? ""),
      articles: Array.isArray(parsed.articles) ? parsed.articles : [],
      precedents: Array.isArray(parsed.precedents) ? parsed.precedents : [],
      sources: parsed.sources,
    };
  } catch {
    return fallback;
  }
}

// --- ACADEMY QUIZ ---
export async function generateAcademyQuiz(
  topic: string,
  lang: AppLanguage,
  userApiKey?: string,
): Promise<QuizQuestion[]> {
  const client = getTextClient(userApiKey);
  const response = await client.chat.completions.create({
    model: TEXT_MODEL,
    messages: [
      {
        role: "user",
        content: `Generate a quiz about "${topic}". Language: ${lang}. 5 questions.
Return ONLY JSON: {"questions":[{"id":"1","question":"...","options":["A","B","C","D"],"correctAnswer":0,"explanation":"..."}]}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const jsonText = response.choices[0]?.message?.content ?? "{}";
  return extractArray<QuizQuestion>(jsonText, []);
}

// --- AUDIO TRANSCRIPTION (Groq Whisper) ---

type VerboseSegment = { id?: number; start?: number; end?: number; text?: string };

/** Parses the verbose_json response from Groq Whisper into TranscriptSegment[]. */
function parseGroqTranscription(raw: unknown): TranscriptSegment[] {
  const result = raw as { text: string; segments?: VerboseSegment[] };
  const fullText = result.text ?? "";
  if (!fullText.trim()) return [];

  const segs = result.segments ?? [];
  if (segs.length > 1) {
    return segs.map((s, i) => ({
      id: `seg_${i + 1}`,
      speaker: `Speaker ${(i % 2) + 1}`,
      text: (s.text ?? "").trim(),
      timestamp: s.start !== undefined ? formatTimestamp(s.start) : "",
      stressLevel: undefined,
      sentiment: undefined,
    }));
  }

  return [{ id: "seg_1", speaker: "Speaker 1", text: fullText.trim(), timestamp: "00:00" }];
}

/**
 * Sends a raw File object directly to Groq Whisper — no base64 roundtrip.
 * This preserves the exact original bytes and avoids any encoding corruption.
 */
export async function transcribeAudioFile(
  file: File,
  lang: AppLanguage,
  userApiKey?: string,
): Promise<TranscriptSegment[]> {
  // Primary: OpenRouter + Gemini via input_audio — native Uzbek/Russian accuracy
  const orKey = userApiKey?.trim() || OPENROUTER_API_KEY;
  if (orKey) {
    return transcribeWithOpenRouter(file, lang, orKey);
  }

  // Groq Whisper fallback (if no OpenRouter key configured)
  const wavFile = await convertToWav(file);

  const formData = new FormData();
  formData.append("file", wavFile, wavFile.name);
  formData.append("model", AUDIO_MODEL);
  formData.append("language", getLangCode(lang));
  formData.append("response_format", "verbose_json");
  formData.append(
    "prompt",
    "Tergov organi tomonidan o\u02bctkazilgan rasmiy so\u02bcroq yoki guvohlik yozuvi. " +
    "Huquqiy atamalar: tergov, dalolatnoma, guvoh, jabrlanuvchi, ayblanuvchi, " +
    "prokuratura, sudya, Jinoyat kodeksi, modda, hibsga olish, tintuv, ayblov.",
  );

  const groqResponse = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${GROQ_API_KEY}` },
    body: formData,
  });

  if (!groqResponse.ok) {
    const errBody = await groqResponse.text().catch(() => groqResponse.statusText);
    throw new Error(`Groq transkriptsiya xatosi ${groqResponse.status}: ${errBody}`);
  }

  const segments = parseGroqTranscription(await groqResponse.json() as unknown);
  if (segments.length === 0) return segments;

  const rawText = segments.map((s) => s.text).join("\n");
  const corrected = await correctTranscriptUzbek(rawText).catch(() => "");
  if (!corrected.trim()) return segments;

  const correctedLines = corrected.trim().split("\n").filter((l) => l.trim());
  if (correctedLines.length === segments.length) {
    return segments.map((s, i) => ({ ...s, text: correctedLines[i].trim() }));
  }
  return [{
    id: "seg_1",
    speaker: segments[0].speaker ?? "Speaker 1",
    text: corrected.trim(),
    timestamp: segments[0].timestamp ?? "00:00",
  }];
}

export async function transcribeAudio(
  base64: string,
  mimeType: string,
  _mode: string,
  _identifySpeakers: boolean,
  lang: AppLanguage,
  _userApiKey?: string,
): Promise<TranscriptSegment[]> {
  const { ext } = normalizeAudioMimeType(mimeType);
  const audioFile = base64ToFile(base64, `audio/${ext}`, `audio.${ext}`);

  const formData = new FormData();
  formData.append("file", audioFile, audioFile.name);
  formData.append("model", AUDIO_MODEL);
  formData.append("language", getLangCode(lang));
  formData.append("response_format", "verbose_json");

  const groqResponse = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${GROQ_API_KEY}` },
    body: formData,
  });

  if (!groqResponse.ok) {
    const errBody = await groqResponse.text().catch(() => groqResponse.statusText);
    throw new Error(`Groq transkriptsiya xatosi ${groqResponse.status}: ${errBody}`);
  }

  return parseGroqTranscription(await groqResponse.json() as unknown);
}

// --- TIMELINE EXTRACTION ---
export async function generateTimelineFromText(
  text: string,
  lang: AppLanguage,
  userApiKey?: string,
): Promise<TimelineEvent[]> {
  const client = getTextClient(userApiKey);
  const response = await client.chat.completions.create({
    model: TEXT_MODEL,
    messages: [
      {
        role: "user",
        content: `Extract timeline events from this text: "${text}". Language: ${lang}.
Return ONLY JSON: {"events":[{"time":"...","date":"...","description":"...","location":"..."}]}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const jsonText = response.choices[0]?.message?.content ?? "{}";
  return extractArray<TimelineEvent>(jsonText, []);
}

// Keep getLangLabel exported for any component that might use it
export { getLangLabel };
