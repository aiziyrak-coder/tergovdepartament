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

// Default models
const TEXT_MODEL = "google/gemini-2.0-flash-001";
const AUDIO_MODEL = "whisper-large-v3";

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
 * Creates a File for Groq audio upload.
 * Content-Type MUST be "audio/<ext>" so that the MIME subtype exactly matches
 * the filename extension — Groq validates consistency between the two.
 * e.g. audio.m4a + Content-Type: audio/m4a  → accepted
 *      audio.m4a + Content-Type: audio/mp4  → rejected (mp4 ≠ m4a)
 *      audio.m4a + no Content-Type          → rejected (browser sends application/octet-stream)
 */
function base64ToGroqFile(base64: string, ext: string): File {
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return new File([bytes], `audio.${ext}`, { type: `audio/${ext}` });
}

/**
 * Normalizes audio MIME type for Groq Whisper compatibility.
 * Strips codec parameters and maps ALL variants (including non-standard) to
 * the exact standard MIME types that Groq accepts.
 */
function normalizeAudioMimeType(rawMime: string): { mime: string; ext: string } {
  const base = rawMime.split(";")[0].trim().toLowerCase();

  // Maps any input MIME → { Groq-accepted standard MIME, file extension }
  // Maps any input MIME → { ext }.
  // base64ToGroqFile uses "audio/<ext>" as Content-Type so subtype exactly matches
  // the filename extension, satisfying Groq's consistency check.
  const map: Record<string, string> = {
    "audio/webm":      "webm",
    "audio/ogg":       "ogg",
    "audio/opus":      "opus",
    "audio/mp4":       "mp4",
    "audio/mpeg":      "mpeg",
    "audio/mp3":       "mp3",
    "audio/wav":       "wav",
    "audio/x-wav":     "wav",
    "audio/wave":      "wav",
    "audio/flac":      "flac",
    "audio/x-flac":    "flac",
    "audio/m4a":       "mp4",   // m4a IS an mp4 container — send as audio.mp4 with audio/mp4
    "audio/x-m4a":     "mp4",
    "audio/aac":       "mp4",
    "video/mp4":       "mp4",
    "video/webm":      "webm",
    "video/ogg":       "ogg",
    "video/quicktime": "mp4",
  };
  const ext = map[base] ?? base.split("/")[1]?.split("+")[0] ?? "webm";
  return { mime: `audio/${ext}`, ext };
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
    const audioFile = base64ToGroqFile(audioBase64, ext);

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
export async function generatePhotorobotVariants(
  prompt: string,
  count: number,
  _type: "HUMAN" | "OBJECT",
  userApiKey?: string,
): Promise<string[]> {
  const client = getTextClient(userApiKey);
  const actualCount = Math.max(1, Math.min(count, 4));

  const imagePromises = Array.from({ length: actualCount }, async () => {
    try {
      const response = await client.images.generate({
        model: "dall-e-3",
        prompt: `Forensic composite portrait sketch: ${prompt}. Realistic detailed face, neutral background, high quality mugshot style.`,
        n: 1,
        size: "1024x1024",
        response_format: "b64_json",
      });
      const b64 = response.data?.[0]?.b64_json;
      return b64 ? `data:image/png;base64,${b64}` : "";
    } catch (error) {
      console.error("Image generation batch failed:", error);
      return "";
    }
  });

  const results = await Promise.all(imagePromises);
  return results.filter(Boolean);
}

export async function editPhotorobotImage(
  imageBase64: string,
  prompt: string,
  userApiKey?: string,
): Promise<string> {
  const client = getTextClient(userApiKey);
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

  // Describe the desired edit using vision, then generate a new image
  const descResponse = await client.chat.completions.create({
    model: TEXT_MODEL,
    messages: [
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Data}` } },
          {
            type: "text",
            text: `This is a forensic photorobot portrait. Describe what this person looks like in detail, then apply these changes: "${prompt}". Return ONLY JSON: {"fullDescription":"detailed description of the final edited portrait"}`,
          },
        ],
      },
    ],
    response_format: { type: "json_object" },
  });

  const descContent = descResponse.choices[0]?.message?.content ?? "{}";
  const desc = safeParseJson<{ fullDescription?: string }>(descContent, {});
  const finalPrompt = desc.fullDescription || prompt;

  const genResponse = await client.images.generate({
    model: "dall-e-3",
    prompt: `Forensic composite portrait: ${finalPrompt}. Realistic, detailed, neutral background, mugshot style.`,
    n: 1,
    size: "1024x1024",
    response_format: "b64_json",
  });

  const b64 = genResponse.data?.[0]?.b64_json;
  if (!b64) throw new Error("Tahrir natijasida rasm topilmadi.");
  return `data:image/png;base64,${b64}`;
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
export async function transcribeAudio(
  base64: string,
  mimeType: string,
  _mode: string,
  _identifySpeakers: boolean,
  lang: AppLanguage,
  _userApiKey?: string,
): Promise<TranscriptSegment[]> {
  const { ext } = normalizeAudioMimeType(mimeType);
  // No MIME type on the File — Groq detects format from filename extension only
  const audioFile = base64ToGroqFile(base64, ext);

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
    throw new Error(
      `Groq ${groqResponse.status}: ${errBody} | file: ${audioFile.name} (type:${audioFile.type}) | rawMime: ${mimeType} → ext: ${ext}`
    );
  }

  const transcriptionRaw = await groqResponse.json() as unknown;

  type VerboseSegment = { id?: number; start?: number; end?: number; text?: string };
  const verboseResult = transcriptionRaw as unknown as {
    text: string;
    segments?: VerboseSegment[];
    language?: string;
  };

  const fullText = verboseResult.text ?? "";
  if (!fullText.trim()) return [];

  const verboseSegments = verboseResult.segments ?? [];

  if (verboseSegments.length > 1) {
    return verboseSegments.map((s, i) => ({
      id: `seg_${i + 1}`,
      speaker: `Speaker ${(i % 2) + 1}`,
      text: (s.text ?? "").trim(),
      timestamp: s.start !== undefined ? formatTimestamp(s.start) : "",
      stressLevel: undefined,
      sentiment: undefined,
    }));
  }

  // Single segment fallback
  return [
    {
      id: "seg_1",
      speaker: "Speaker 1",
      text: fullText.trim(),
      timestamp: "00:00",
    },
  ];
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
