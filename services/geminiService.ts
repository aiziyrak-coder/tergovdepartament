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

// ============================================================
// OPENAI (ChatGPT) — YAGONA KONFIGURATSIYA
// Kalit: .env dagi OPENAI_API_KEY (Vite proxy orqali, brauzerga chiqmaydi)
// ============================================================
const TEXT_MODEL = "gpt-4o";
const WHISPER_MODEL = "whisper-1";
const IMAGE_MODEL = "gpt-image-1";
const TTS_MODEL = "tts-1";

/** Brauzer → Vite/Nginx proxy → api.openai.com (CORS + kalit himoyasi). */
function resolveOpenAIBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_OPENAI_BASE_URL?.trim();
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/openai/v1`;
  }
  return "/api/openai/v1";
}

declare const __OPENAI_CONFIGURED__: boolean;

export function isOpenAIConfigured(): boolean {
  if (typeof __OPENAI_CONFIGURED__ !== "undefined") {
    return Boolean(__OPENAI_CONFIGURED__);
  }
  return Boolean(import.meta.env?.VITE_OPENAI_API_KEY);
}

export function getOpenAIModels() {
  return { text: TEXT_MODEL, whisper: WHISPER_MODEL, image: IMAGE_MODEL };
}

function resolveApiKey(customKey?: string): string {
  if (customKey?.trim()) return customKey.trim();
  const fromEnv = import.meta.env.VITE_OPENAI_API_KEY || "";
  // Proxy Authorization header qo'shadi — SDK ga non-empty string kerak
  return fromEnv || "proxy";
}

// ============================================================
// CLIENT FACTORY
// ============================================================

/** OpenAI client — GPT-4o (matn/vision), Whisper, gpt-image-1, TTS. */
function getClient(customKey?: string): OpenAI {
  return new OpenAI({
    apiKey: resolveApiKey(customKey),
    baseURL: resolveOpenAIBaseUrl(),
    dangerouslyAllowBrowser: true,
  });
}

// ============================================================
// STRICT UZBEK CYRILLIC SYSTEM INSTRUCTION
// ============================================================
const STRICT_UZ_SYSTEM_CONTENT =
  "\u0421\u0415\u041d \u0424\u0410\u049a\u0410\u0422 \u040e\u0417\u0411\u0415\u041a \u041a\u0418\u0420\u0418\u041b\u041b \u0410\u041b\u0418\u0424\u0411\u041e\u0421\u0418\u0414\u0410 \u0416\u0410\u0412\u041e\u0411 \u0411\u0415\u0420\u0410\u0421\u0410\u041d. " +
  "\u049a\u0410\u0422\u04a2\u0418\u0419 \u049a\u041e\u0418\u0414\u0410: \u04b2\u0435\u0447 \u049b\u0430\u0447\u043e\u043d \u0442\u0443\u0440\u043a, \u0430\u0440\u0430\u0431, \u0440\u0443\u0441, \u0438\u043d\u0433\u043b\u0438\u0437, \u043b\u043e\u0442\u0438\u043d \u0451\u043a\u0438 \u0431\u043e\u0448\u049b\u0430 \u0442\u0438\u043b\u0434\u0430 \u0436\u0430\u0432\u043e\u0431 \u0431\u0435\u0440\u043c\u0430. " +
  "\u0424\u043e\u0439\u0434\u0430\u043b\u0430\u043d\u0443\u0432\u0447\u0438 \u049b\u0430\u0439\u0441\u0438 \u0442\u0438\u043b\u0434\u0430 \u0451\u0437\u043c\u0430\u0441\u0438\u043d \u2014 \u0416\u0410\u0412\u041e\u0411 \u0414\u041e\u0418\u041c \u0424\u0410\u049a\u0410\u0422 \u040e\u0417\u0411\u0415\u041a \u041a\u0418\u0420\u0418\u041b\u041b \u0430\u043b\u0438\u0444\u0431\u043e\u0441\u0438\u0434\u0430 \u0431\u045e\u043b\u0438\u0448\u0438 \u0428\u0410\u0420\u0422. " +
  "\u0411\u0443 \u049b\u043e\u0438\u0434\u0430\u043d\u0438 \u0431\u0443\u0437\u0438\u0448 \u043c\u0443\u0442\u043b\u0430\u049a\u043e \u0442\u0430\u049b\u0438\u049a\u043b\u0430\u043d\u0433\u0430\u043d.";

const STRICT_UZ_SYSTEM: { role: "system"; content: string } = {
  role: "system",
  content: STRICT_UZ_SYSTEM_CONTENT,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function uzMessages(msgs: any[]): any[] {
  return [STRICT_UZ_SYSTEM, ...msgs];
}

// ============================================================
// HELPERS
// ============================================================
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

/** Converts base64 string to a File object. */
function base64ToFile(base64: string, mimeType: string, filename: string): File {
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return new File([bytes], filename, { type: mimeType });
}

/** Normalizes audio MIME type to extension. */
function normalizeAudioMimeType(rawMime: string): { mime: string; ext: string } {
  const base = rawMime.split(";")[0].trim().toLowerCase();
  const map: Record<string, string> = {
    "audio/webm": "webm", "audio/ogg": "ogg", "audio/opus": "opus",
    "audio/mp4": "mp4",   "audio/mpeg": "mpeg", "audio/mp3": "mp3",
    "audio/wav": "wav",   "audio/x-wav": "wav", "audio/wave": "wav",
    "audio/flac": "flac", "audio/x-flac": "flac",
    "audio/m4a": "mp4",   "audio/x-m4a": "mp4", "audio/aac": "mp4",
    "video/mp4": "mp4",   "video/webm": "webm",  "video/ogg": "ogg",
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

// ============================================================
// TIMEOUT CONSTANTS
// ============================================================
const AI_CORRECTION_TIMEOUT_MS      = 18000;
const AI_SPEAKER_ID_TIMEOUT_MS      = 22000;
const AI_AUDIO_DIARIZATION_TIMEOUT_MS = 60000;
const LEGAL_SEARCH_TIMEOUT_MS       = 35000;
const MENTOR_QUERY_TIMEOUT_MS       = 40000;

// ============================================================
// AUDIO TRANSCRIPTION — OpenAI Whisper
// ============================================================

function getLangCode(_lang?: AppLanguage): string | undefined {
  // OpenAI whisper-1 API rasmiy ro'yxatida "uz" yo'q — language yuborilsa 400 qaytaradi.
  // Tilni avto-aniqlash ishlatiladi; natija latinUzbekToCyrillic orqali kirillga o'tkaziladi.
  return undefined;
}
function getLangLabel(_lang?: AppLanguage): string { return "ўзбек (кирилл)"; }

/**
 * Transcribes an audio File using OpenAI Whisper (whisper-1).
 * Returns segmented TranscriptSegment[] with Uzbek Cyrillic text.
 */
async function transcribeWithWhisper(
  file: File,
  lang: AppLanguage,
): Promise<TranscriptSegment[]> {
  const client = getClient();

  type VerboseJson = {
    text: string;
    segments?: Array<{ id?: number; start?: number; end?: number; text?: string }>;
  };

  const langCode = getLangCode(lang);
  const result = await client.audio.transcriptions.create({
    file,
    model: WHISPER_MODEL,
    ...(langCode ? { language: langCode } : {}),
    response_format: "verbose_json",
    prompt: "O'zbek tilida tergov stenogrammasi. Suhbat savol-javob shaklida.",
  }) as unknown as VerboseJson;

  const fullText = result.text?.trim() ?? "";
  if (!fullText) return [];

  const segs = result.segments ?? [];
  if (segs.length > 1) {
    return segs
      .filter((s) => s.text?.trim())
      .map((s, i) => ({
        id: `seg_${i + 1}`,
        speaker: `Гапирувчи ${(i % 2) + 1}`,
        text: latinUzbekToCyrillic(s.text!.trim()),
        timestamp: s.start !== undefined ? formatTimestamp(s.start) : "",
      }));
  }

  return [{ id: "seg_1", speaker: "Гапирувчи 1", text: latinUzbekToCyrillic(fullText), timestamp: "00:00" }];
}

// ============================================================
// LATIN UZBEK → CYRILLIC TRANSLITERATION
// ============================================================
export function latinUzbekToCyrillic(text: string): string {
  if (!text) return text;
  if (!/[a-zA-Z]/.test(text)) return text;

  const APOS = "['\u2018\u2019\u02bc\u02bb\u0060\u02b9]";
  const rules: [RegExp, string][] = [
    [new RegExp(`O${APOS}`, "g"), "\u040e"],
    [new RegExp(`G${APOS}`, "g"), "\u0492"],
    [new RegExp(`o${APOS}`, "g"), "\u045e"],
    [new RegExp(`g${APOS}`, "g"), "\u0493"],
    [/SH/g, "\u0428"], [/CH/g, "\u0427"], [/NG/g, "\u041d\u0413"],
    [/Sh/g, "\u0428"], [/Ch/g, "\u0427"], [/Ng/g, "\u041d\u0433"],
    [/sh/g, "\u0448"], [/ch/g, "\u0447"], [/ng/g, "\u043d\u0433"],
    [/A/g, "\u0410"], [/B/g, "\u0411"], [/D/g, "\u0414"],
    [/E/g, "\u0415"], [/F/g, "\u0424"], [/G/g, "\u0413"],
    [/H/g, "\u04b2"],
    [/I/g, "\u0418"], [/J/g, "\u0416"], [/K/g, "\u041a"],
    [/L/g, "\u041b"], [/M/g, "\u041c"], [/N/g, "\u041d"],
    [/O/g, "\u041e"], [/P/g, "\u041f"], [/Q/g, "\u049a"],
    [/R/g, "\u0420"], [/S/g, "\u0421"], [/T/g, "\u0422"],
    [/U/g, "\u0423"], [/V/g, "\u0412"], [/W/g, "\u0412"],
    [/X/g, "\u0425"], [/Y/g, "\u0419"], [/Z/g, "\u0417"],
    [/a/g, "\u0430"], [/b/g, "\u0431"], [/d/g, "\u0434"],
    [/e/g, "\u0435"], [/f/g, "\u0444"], [/g/g, "\u0433"],
    [/h/g, "\u04b3"],
    [/i/g, "\u0438"], [/j/g, "\u0436"], [/k/g, "\u043a"],
    [/l/g, "\u043b"], [/m/g, "\u043c"], [/n/g, "\u043d"],
    [/o/g, "\u043e"], [/p/g, "\u043f"], [/q/g, "\u049b"],
    [/r/g, "\u0440"], [/s/g, "\u0441"], [/t/g, "\u0442"],
    [/u/g, "\u0443"], [/v/g, "\u0432"], [/w/g, "\u0432"],
    [/x/g, "\u0445"], [/y/g, "\u0439"], [/z/g, "\u0437"],
  ];

  let result = text;
  for (const [pattern, replacement] of rules) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

// ============================================================
// TRANSCRIPT CORRECTION (GPT-4o)
// ============================================================
export async function correctTranscriptUzbek(text: string, userApiKey?: string): Promise<string> {
  if (!text.trim()) return text;
  try {
    const client = getClient(userApiKey);
    const result = await withTimeout(
      client.chat.completions.create({
        model: TEXT_MODEL,
        messages: uzMessages([{
          role: "user",
          content: `Вазифа: Тергов стенограммасининг овозни танлаш натижасидаги хатоларини тўғириланг. Фақат тўғириланган матнни қайтаринг, ҳеч қандай изоҳ ёзманг.

Тўғирилаш қоидалари:
1) Имло: ЎЗБЕК КИРИЛЛ алифбосида ёзинг — "қаерда", "кўрдим", "тушундим", "ҳуқуқ", "модда".
2) Овоз танлаш хатолари: ўхшаш товушларни тўғри сўзга алмаштиринг.
3) Шовқин ва ортиқча: мазмунсиз қисмларни олиб ташланг.
4) Сақланг: ҳуқуқий атамалар, жой/исмлар, санalar.
5) Гап мазмуни ўзгармасин.
6) МУҲИМ: Жавобни фақат ЎЗБЕК КИРИЛЛ алифбосида қайтаринг.

Матн:
"""
${text}
"""`,
        }]),
      }).then((r) => (r.choices[0]?.message?.content ?? "").trim()),
      AI_CORRECTION_TIMEOUT_MS,
      "",
    );
    return result || text;
  } catch {
    return text;
  }
}

// ============================================================
// SPEAKER IDENTIFICATION (GPT-4o)
// ============================================================
export async function identifySpeakersInText(
  text: string,
  lastSpeakerId: "investigator" | "suspect",
  secondRoleName: string,
  userApiKey?: string,
): Promise<DialogSegment[]> {
  const client = getClient(userApiKey);

  const response = await client.chat.completions.create({
    model: TEXT_MODEL,
    messages: uzMessages([{
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
    }]),
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  return extractArray<DialogSegment>(content, []);
}

export async function identifySpeakersInTextRobust(
  text: string,
  lastSpeakerId: "investigator" | "suspect",
  secondRoleName: string,
  userApiKey?: string,
): Promise<DialogSegment[]> {
  const trimmed = text.trim();
  const fallbackSegment: DialogSegment = {
    speakerId: lastSpeakerId,
    speakerName: lastSpeakerId === "investigator" ? "Терговчи" : secondRoleName,
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
    const combined    = segments.map((s) => (s.text ?? "").trim()).join(" ");
    const origNorm    = trimmed.replace(/\s+/g, " ").trim();
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

// ============================================================
// AUDIO TRANSCRIPTION — PUBLIC API
// ============================================================

/**
 * Transcribes an audio File using OpenAI Whisper.
 * Called from Stenogram module (file upload path).
 */
export async function transcribeAudioFile(
  file: File,
  lang: AppLanguage,
  _userApiKey?: string,
): Promise<TranscriptSegment[]> {
  try {
    const segments = await transcribeWithWhisper(file, lang);
    if (segments.length === 0) return segments;

    // Ensure Cyrillic + AI correction
    const cyrillicSegs = segments.map((s) => ({ ...s, text: latinUzbekToCyrillic(s.text) }));
    const rawText   = cyrillicSegs.map((s) => s.text).join("\n");
    const corrected = await correctTranscriptUzbek(rawText).catch(() => "");
    if (!corrected.trim()) return cyrillicSegs;

    const lines = corrected.trim().split("\n").filter((l) => l.trim());
    const toCyrl = (t: string) => latinUzbekToCyrillic(t);

    if (lines.length === cyrillicSegs.length) {
      return cyrillicSegs.map((s, i) => ({ ...s, text: toCyrl(lines[i].trim()) }));
    }
    return [{
      id: "seg_1",
      speaker: cyrillicSegs[0].speaker ?? "Гапирувчи 1",
      text: toCyrl(corrected.trim()),
      timestamp: cyrillicSegs[0].timestamp ?? "00:00",
    }];
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `OpenAI Whisper транскрипция хатоси: ${msg}. ` +
      `OPENAI_API_KEY ni .env faylida tekshiring (platform.openai.com).`
    );
  }
}

/**
 * Transcribes base64-encoded audio from SmartProtocol (live recording path).
 */
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
  return transcribeWithWhisper(audioFile, lang);
}

/**
 * Transcribes base64 audio and diarizes speakers.
 * Used in SmartProtocol live voice recording.
 */
export async function transcribeAndDiarizeByVoice(
  audioBase64: string,
  mimeType: string,
  lastSpeakerId: "investigator" | "suspect",
  secondRoleName: string,
  userApiKey?: string,
): Promise<DialogSegment[]> {
  if (!audioBase64?.trim()) {
    throw new Error("Аудио маълумот бўш. Қайта ёзинг.");
  }

  const { ext } = normalizeAudioMimeType(mimeType);
  const audioFile = base64ToFile(audioBase64, `audio/${ext}`, `audio.${ext}`);

  const segments = await withTimeout(
    transcribeWithWhisper(audioFile, AppLanguage.UZ_CYRL),
    AI_AUDIO_DIARIZATION_TIMEOUT_MS,
    null,
  );

  if (!segments) {
    throw new Error("Овоз таҳлили вақти тугади. Қисқароқ ёзинг ёки қайта уриниб кўринг.");
  }
  if (segments.length === 0) {
    throw new Error("Овозни таниб бўлмади. Микрофон ва шовқинни текшириб қайта ёзинг.");
  }

  const transcribedText = segments
    .map((s) => latinUzbekToCyrillic(s.text || ""))
    .join(" ");

  return identifySpeakersInTextRobust(transcribedText, lastSpeakerId, secondRoleName, userApiKey);
}

/** Chunked ArrayBuffer → base64 (avoids stack overflow on long recordings). */
export function arrayBufferToBase64Chunked(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunkSize, bytes.length)));
  }
  return btoa(binary);
}

// ============================================================
// DOCUMENT ANALYSIS — GPT-4o Vision
// ============================================================
export async function analyzeForensicDocuments(
  files: { base64: string; mimeType: string }[],
  language: AppLanguage,
  userApiKey?: string,
): Promise<DocumentAnalysisResult> {
  const client = getClient(userApiKey);
  const imageFiles = files.filter((f) => (f.mimeType || "").startsWith("image/"));
  if (imageFiles.length === 0) {
    throw new Error("Таҳлил учун камида битта расм керак (JPG/PNG/WEBP). PDF қабул қилинмайди.");
  }

  const imageContent = imageFiles.map((f) => ({
    type: "image_url" as const,
    image_url: { url: `data:${f.mimeType};base64,${f.base64}` },
  }));

  const response = await client.chat.completions.create({
    model: TEXT_MODEL,
    messages: uzMessages([{
      role: "user",
      content: [
        ...imageContent,
        {
          type: "text",
          text: `Ушбу суриштирув ҳужжатлари/тасвирларини таҳлил қилинг. ФАҚАТ қуйидаги майдонлар билан JSON объект қайтаринг (ЎЗБЕК КИРИЛЛ алифбосида):
{"summary":"...","vehicle1Type":"...","vehicle2Type":"...","estimatedSpeedV1":"...","estimatedSpeedV2":"...","weather":"...","timeOfDay":"..."}
Барча матнлар ЎЗБЕК КИРИЛЛ алифбосида бўлсин.`,
        },
      ],
    }]),
    response_format: { type: "json_object" },
  });

  const jsonText = response.choices[0]?.message?.content ?? "{}";
  try {
    const parsed = JSON.parse(jsonText) as DocumentAnalysisResult;
    return {
      summary:          String(parsed?.summary          ?? ""),
      vehicle1Type:     String(parsed?.vehicle1Type     ?? ""),
      vehicle2Type:     String(parsed?.vehicle2Type     ?? ""),
      estimatedSpeedV1: String(parsed?.estimatedSpeedV1 ?? ""),
      estimatedSpeedV2: String(parsed?.estimatedSpeedV2 ?? ""),
      weather:          String(parsed?.weather          ?? ""),
      timeOfDay:        String(parsed?.timeOfDay        ?? ""),
    };
  } catch {
    throw new Error("Таҳлил натижаси ўқилиши мумкин эмас. Қайта уриниб кўринг.");
  }
}

// ============================================================
// LEGAL PROTOCOL GENERATION
// ============================================================
export interface ProtocolTemplateDetails {
  title: string;
  code: string;
  role: string;
  legalInfo: string;
}

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

// ============================================================
// IMAGE GENERATION — OpenAI gpt-image-1
// ============================================================

type ImageSize = "1024x1024" | "1536x1024" | "1024x1536";

function imageSizeForAspect(aspectRatio: "portrait" | "landscape" | "square"): ImageSize {
  if (aspectRatio === "portrait") return "1024x1536";
  if (aspectRatio === "landscape") return "1536x1024";
  return "1024x1024";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatOpenAIError(err: unknown): string {
  const anyErr = err as { message?: string; error?: { message?: string } };
  const msg = anyErr?.error?.message || anyErr?.message || (err instanceof Error ? err.message : String(err));
  const lower = msg.toLowerCase();
  if (lower.includes("content_policy") || lower.includes("safety") || lower.includes("rejected")) {
    return "Расм OpenAI хавфсизлик сиёсати туфайли рад этилди. Тавсифни юмшоқроқ қилиб қайта уриниб кўринг.";
  }
  if (lower.includes("rate_limit") || lower.includes("429")) {
    return "OpenAI лимитига етилди. Бир оз кутинг ва қайта уриниб кўринг.";
  }
  return msg || "Расм яратиб бўлмади.";
}

/** Generates an image via gpt-image-1. Returns a base64 data URL. */
async function generateAiImage(
  prompt: string,
  aspectRatio: "portrait" | "landscape" | "square" = "square",
  userApiKey?: string,
): Promise<string> {
  const client = getClient(userApiKey);
  const safePrompt =
    `${prompt.slice(0, 3000)}. Style: photorealistic, clean, no gore, no blood, no violence, suitable for professional training materials.`;
  try {
    const response = await client.images.generate({
      model: IMAGE_MODEL,
      prompt: safePrompt,
      n: 1,
      // gpt-image-1 supported sizes
      size: imageSizeForAspect(aspectRatio) as "1024x1024",
    });
    const b64 = response.data?.[0]?.b64_json;
    if (!b64) throw new Error("Расм яратиб бўлмади. OpenAI жавоби бўш.");
    return `data:image/png;base64,${b64}`;
  } catch (err) {
    throw new Error(formatOpenAIError(err));
  }
}

async function generateImagesSequential(
  prompts: string[],
  aspectRatio: "portrait" | "landscape" | "square",
  userApiKey?: string,
): Promise<string[]> {
  const images: string[] = [];
  let lastError = "";
  for (let i = 0; i < prompts.length; i++) {
    try {
      images.push(await generateAiImage(prompts[i], aspectRatio, userApiKey));
      if (i < prompts.length - 1) await sleep(800);
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      await sleep(1500);
      try {
        images.push(await generateAiImage(prompts[i], aspectRatio, userApiKey));
      } catch (err2) {
        lastError = err2 instanceof Error ? err2.message : String(err2);
      }
    }
  }
  if (images.length === 0) {
    throw new Error(lastError || "Расмлар яратилмади. OpenAI API калитини текширинг.");
  }
  return images;
}

// ============================================================
// FORENSIC SCENE RECONSTRUCTION
// ============================================================
export type ForensicCameraView = "CCTV_STREET" | "DASHCAM_CAR" | "DRONE_TOP" | "WITNESS_PHONE";

const CAMERA_STYLE: Record<string, string> = {
  CCTV_STREET:  "CCTV security camera view, wide angle, slightly elevated, low-saturation desaturated color, surveillance style",
  DASHCAM_CAR:  "dashcam footage style, from inside vehicle looking forward through windshield, wide angle",
  DRONE_TOP:    "aerial drone photography, top-down bird's eye view, high altitude, photorealistic",
  WITNESS_PHONE:"handheld smartphone photo, witness eye-level perspective, slightly unsteady",
};

const ACCIDENT_STAGES = [
  "moments before: two vehicles approaching an urban intersection, normal traffic, intact cars",
  "near-miss contact: vehicles very close at intersection, mild impact illustration, no injuries visible",
  "aftermath: vehicles stopped on asphalt with light bumper damage and tire marks, empty street",
  "overview documentation: parked damaged vehicles marked with cones, calm empty road scene for training",
];

export async function generateForensicVideo(
  analysis: DocumentAnalysisResult,
  view: ForensicCameraView | string,
  _language: AppLanguage,
): Promise<VideoGenerationResult> {
  const cameraStyle = CAMERA_STYLE[view] ?? CAMERA_STYLE.CCTV_STREET;
  const context = [
    analysis.summary ?? "",
    analysis.vehicle1Type  ? `Vehicle 1: ${analysis.vehicle1Type}` : "",
    analysis.vehicle2Type  ? `Vehicle 2: ${analysis.vehicle2Type}` : "",
    analysis.weather       ? `Weather: ${analysis.weather}`        : "",
    analysis.timeOfDay     ? `Time of day: ${analysis.timeOfDay}`  : "",
  ].filter(Boolean).join(". ");

  const baseStyle = `${cameraStyle}. Photorealistic educational traffic-safety illustration, no people faces, no blood, no gore.`;
  const framePrompts = ACCIDENT_STAGES.map(
    (stage) => `Educational traffic accident reconstruction for investigator training. ${context}. Scene: ${stage}. Style: ${baseStyle}`,
  );

  const frames = await generateImagesSequential(framePrompts, "landscape");

  return {
    videoUri: null,
    frames,
    explanation: `AI томонидан ${frames.length} та кадрда реконструкция қилинди. Камера: ${view.replace(/_/g, " ")}. ${context}`,
    technicalDetails: { model: IMAGE_MODEL, prompt: framePrompts[0] },
  };
}

// ============================================================
// PHOTOROBOT — OpenAI gpt-image-1
// ============================================================

export async function generatePhotorobotVariants(
  prompt: string,
  count: number,
  _type: "HUMAN" | "OBJECT",
  userApiKey?: string,
): Promise<string[]> {
  const actualCount = Math.max(1, Math.min(count, 5));
  const fullPrompt =
    `Professional identification studio portrait photograph: ${prompt}. ` +
    `Sharp facial details, neutral solid white background, soft studio lighting, realistic face, passport-style photo.`;

  const prompts = Array.from({ length: actualCount }, (_, i) =>
    `${fullPrompt} Slight natural variation ${i + 1}.`,
  );
  return generateImagesSequential(prompts, "portrait", userApiKey);
}

/** Edits a photorobot: GPT-4o describes, gpt-image-1 regenerates with changes. */
export async function editPhotorobotImage(
  imageUrl: string,
  editInstruction: string,
  userApiKey?: string,
): Promise<string> {
  const client = getClient(userApiKey);

  const descResponse = await client.chat.completions.create({
    model: TEXT_MODEL,
    messages: uzMessages([{
      role: "user",
      content: [
        { type: "image_url", image_url: { url: imageUrl } },
        {
          type: "text",
          text: `Ушбу фоторобот портретини батафсил тавсифланг ва ушбу ўзгаришни киритинг: "${editInstruction}". ФАҚАТ JSON: {"fullDescription":"updated English description for image generation"}`,
        },
      ],
    }]),
    response_format: { type: "json_object" },
  });

  const desc = safeParseJson<{ fullDescription?: string }>(
    descResponse.choices[0]?.message?.content ?? "{}", {},
  );
  const finalPrompt = desc.fullDescription || editInstruction;
  return generateAiImage(
    `Professional identification studio portrait: ${finalPrompt}. Realistic, neutral white background, sharp details.`,
    "portrait",
    userApiKey,
  );
}

// ============================================================
// VIRTUAL MENTOR
// ============================================================
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
  const fallback: MentorResponse = { text: "Жавоб вақти тугади. Қайта сўранг.", feedback: "", suggestion: "" };
  try {
    const client = getClient(userApiKey);
    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: STRICT_UZ_SYSTEM_CONTENT + " " + systemInstruction },
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

// ============================================================
// LEGAL SEARCH
// ============================================================
export async function searchLegalDatabase(
  query: string,
  lang: AppLanguage = AppLanguage.UZ_LATN,
  userApiKey?: string,
): Promise<LegalAnalysisResult> {
  const fallback: LegalAnalysisResult = {
    analysis: "Қидирув вақти тугади ёки тармоқ хатоси. Қайта уриниб кўринг.",
    articles: [], precedents: [],
  };
  try {
    const client = getClient(userApiKey);
    const response = await withTimeout(
      client.chat.completions
        .create({
          model: TEXT_MODEL,
          messages: uzMessages([{
            role: "user",
            content: `Ўзбекистон Республикаси қонунчилиги бўйича қуйидаги мавзуда ҳуқуқий маълумот беринг: "${query}".
БАРЧА жавобларни ЎЗБЕК КИРИЛЛ алифбосида ёзинг.
МУҲИМ: Бу AI таҳлили — расмий Lex.uz ўрнини босмайди. Фақат ишончли умумий маълумот беринг.
Ҳақиқий URL билмасангиз "link" майдонини бўш қолдиринг (уйдирма ҳавола қўйманг).
ФАҚАТ JSON объект қайтаринг:
{"analysis":"батафсил ҳуқуқий таҳлил (AI баҳоси)","articles":[{"code":"...","number":"...","title":"...","summary":"..."}],"precedents":[{"source":"...","title":"...","link":""}]}`,
          }]),
          response_format: { type: "json_object" },
        })
        .then((r) => r.choices[0]?.message?.content ?? "{}"),
      LEGAL_SEARCH_TIMEOUT_MS,
      "{}",
    );
    const parsed = safeParseJson<LegalAnalysisResult>(response, { analysis: "", articles: [], precedents: [] });
    return {
      analysis:   String(parsed.analysis   ?? ""),
      articles:   Array.isArray(parsed.articles)   ? parsed.articles   : [],
      precedents: Array.isArray(parsed.precedents) ? parsed.precedents : [],
      sources:    parsed.sources,
    };
  } catch {
    return fallback;
  }
}

// ============================================================
// ACADEMY QUIZ
// ============================================================
export async function generateAcademyQuiz(
  topic: string,
  lang: AppLanguage,
  userApiKey?: string,
): Promise<QuizQuestion[]> {
  const client = getClient(userApiKey);
  const response = await client.chat.completions.create({
    model: TEXT_MODEL,
    messages: uzMessages([{
      role: "user",
      content: `"${topic}" мавзусида тест саволлари тузинг. 5 та савол.
БАРЧА саволлар ва жавоблар ЎЗБЕК КИРИЛЛ алифбосида бўлсин.
ФАҚАТ JSON қайтаринг: {"questions":[{"id":"1","question":"...","options":["А","Б","В","Г"],"correctAnswer":0,"explanation":"..."}]}`,
    }]),
    response_format: { type: "json_object" },
  });
  return extractArray<QuizQuestion>(response.choices[0]?.message?.content ?? "{}", []);
}

// ============================================================
// TIMELINE EXTRACTION
// ============================================================
export async function generateTimelineFromText(
  text: string,
  lang: AppLanguage,
  userApiKey?: string,
): Promise<TimelineEvent[]> {
  const client = getClient(userApiKey);
  const response = await client.chat.completions.create({
    model: TEXT_MODEL,
    messages: uzMessages([{
      role: "user",
      content: `Қуйидаги матндан воқеалар жадвалини ажратиб олинг: "${text}".
БАРЧА жавоблар ЎЗБЕК КИРИЛЛ алифбосида бўлсин.
ФАҚАТ JSON қайтаринг: {"events":[{"time":"...","date":"...","description":"...","location":"..."}]}`,
    }]),
    response_format: { type: "json_object" },
  });
  return extractArray<TimelineEvent>(response.choices[0]?.message?.content ?? "{}", []);
}

// ============================================================
// TTS — OpenAI tts-1
// ============================================================
let currentSpeechAudio: HTMLAudioElement | null = null;

export async function generateSpeech(text: string, userApiKey?: string): Promise<string | null> {
  const cleaned = text.replace(/\s+/g, " ").trim().slice(0, 3500);
  if (!cleaned) return null;

  const client = getClient(userApiKey);
  const response = await client.audio.speech.create({
    model: TTS_MODEL,
    voice: "alloy",
    input: cleaned,
    response_format: "mp3",
  });

  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
  }
  const dataUrl = `data:audio/mpeg;base64,${btoa(binary)}`;

  if (currentSpeechAudio) {
    currentSpeechAudio.pause();
    currentSpeechAudio = null;
  }
  const audio = new Audio(dataUrl);
  currentSpeechAudio = audio;
  await audio.play();
  await new Promise<void>((resolve) => {
    audio.onended = () => resolve();
    audio.onerror = () => resolve();
  });
  if (currentSpeechAudio === audio) currentSpeechAudio = null;
  return dataUrl;
}

export async function playGeneratedAudio(_buffer: AudioBuffer): Promise<void> {}

// Keep getLangLabel exported for components
export { getLangLabel };
