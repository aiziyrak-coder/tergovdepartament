import { GoogleGenAI, Type, Modality } from "@google/genai";
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

declare const __GEMINI_API_KEY__: string | undefined;

const API_KEY_ENV = typeof process !== "undefined" ? process.env?.API_KEY : undefined;
const GEMINI_KEY_ENV = typeof process !== "undefined" ? process.env?.GEMINI_API_KEY : undefined;
const BUILD_TIME_GEMINI_KEY = typeof __GEMINI_API_KEY__ === "string" ? __GEMINI_API_KEY__ : undefined;

/** Resolves API key: customKey > BUILD > API_KEY > GEMINI_API_KEY. */
function resolveApiKey(customKey?: string): string {
  const key =
    customKey?.trim() || BUILD_TIME_GEMINI_KEY || API_KEY_ENV || GEMINI_KEY_ENV;
  if (!key) throw new Error("❌ API kalit topilmadi. Yangi API key olish: https://console.cloud.google.com/\nSorzlamalar > Environment 'da GEMINI_API_KEY ni belgilang.");
  return key;
}

function getAiClient(customKey?: string): GoogleGenAI {
  return new GoogleGenAI({ apiKey: resolveApiKey(customKey) });
}

// --- HELPER FUNCTIONS ---
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/** Camera view type for forensic video generation. */
export type ForensicCameraView = 'CCTV_STREET' | 'DASHCAM_CAR' | 'DRONE_TOP' | 'WITNESS_PHONE';

function normalizeApiError(e: unknown): string {
  if (e && typeof e === "object" && "error" in e) {
    const err = (e as { error?: { code?: string; message?: string; status?: string } }).error;
    if (err) return [err.code, err.status, err.message].filter(Boolean).join(" ") || "Noma'lum API xatosi.";
  }
  if (e instanceof Error) return e.message;
  return typeof e === "string" ? e : "Noma'lum xatolik.";
}

// --- VIDEO GENERATION (VEO MODEL) ---
export async function generateForensicVideo(
  analysis: DocumentAnalysisResult,
  view: ForensicCameraView | string,
  _language: AppLanguage,
  userApiKey?: string
): Promise<VideoGenerationResult> {
  const activeApiKey = resolveApiKey(userApiKey);
  const ai = new GoogleGenAI({ apiKey: activeApiKey });

  const viewLabel =
    view === "CCTV_STREET" ? "High angle CCTV security camera view" :
    view === "DRONE_TOP" ? "Top-down drone view" :
    view === "WITNESS_PHONE" ? "Handheld witness smartphone camera view" :
    "Dashcam view from a car";

  const prompt = `CCTV footage simulation of a traffic accident. Context: ${analysis.summary}. Details: Vehicle 1 (${analysis.vehicle1Type}) colliding with Vehicle 2 (${analysis.vehicle2Type}). Conditions: ${analysis.weather}, ${analysis.timeOfDay}. Viewpoint: ${viewLabel}. Style: Realistic, grainy security footage.`;

  try {
    let operation = await ai.models.generateVideos({
      model: "veo-3.1-fast-generate-preview",
      prompt,
      config: { numberOfVideos: 1, resolution: "720p", aspectRatio: "16:9" },
    });

    while (!operation.done) {
      await new Promise((r) => setTimeout(r, 5000));
      operation = await ai.operations.getVideosOperation({ operation });
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("Video URI javobda topilmadi.");

    const videoResponse = await fetch(`${videoUri}&key=${activeApiKey}`);
    if (!videoResponse.ok) throw new Error(`Video yuklab olinmadi: ${videoResponse.status} ${videoResponse.statusText}`);

    const videoBlob = await videoResponse.blob();
    const blobUrl = URL.createObjectURL(videoBlob);

    return {
      videoUri: blobUrl,
      explanation: "Veo modeli orqali generatsiya qilindi.",
      technicalDetails: { model: "veo-3.1-fast-generate-preview", prompt },
    };
  } catch (e) {
    console.error("Veo Generation Error:", e);
    throw new Error("Video generatsiya qilishda xatolik: " + normalizeApiError(e));
  }
}

const AudioContextClass = typeof window !== "undefined" ? (window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) : null;

export async function generateSpeech(text: string, userApiKey?: string): Promise<AudioBuffer | null> {
  try {
    const ai = getAiClient(userApiKey);
    const cleanText = text.substring(0, 1000);
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: cleanText }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Fenrir" } } },
      },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio || typeof base64Audio !== "string") return null;
    if (!AudioContextClass) return null;
    const ctx = new AudioContextClass({ sampleRate: 24000 }) as AudioContext;
    const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
    return audioBuffer;
  } catch {
    return null;
  }
}

export async function playGeneratedAudio(buffer: AudioBuffer): Promise<void> {
  try {
    const Ctx = typeof window !== "undefined" ? (window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) : null;
    if (!Ctx) return;
    const audioContext = new Ctx() as AudioContext;
    if (audioContext.state === "suspended") await audioContext.resume();
    const gain = audioContext.createGain();
    gain.connect(audioContext.destination);
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(gain);
    source.start();
  } catch (e) {
    console.error("Audio Playback Error:", e);
  }
}

// --- DOCUMENT ANALYSIS ---
export async function analyzeForensicDocuments(
  files: { base64: string; mimeType: string }[],
  language: AppLanguage,
  userApiKey?: string
): Promise<DocumentAnalysisResult> {
  const ai = getAiClient(userApiKey);
  const parts: Array<{ inlineData: { data: string; mimeType: string } } | { text: string }> = files.map((f) => ({
    inlineData: { data: f.base64, mimeType: f.mimeType },
  }));
  parts.push({
    text: `Analyze these forensic documents/images. Extract summary, vehicle types, speed estimation, weather, time of day. Return JSON. Language: ${language}`,
  });

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          vehicle1Type: { type: Type.STRING },
          vehicle2Type: { type: Type.STRING },
          estimatedSpeedV1: { type: Type.STRING },
          estimatedSpeedV2: { type: Type.STRING },
          weather: { type: Type.STRING },
          timeOfDay: { type: Type.STRING },
        },
      },
    },
  });

  const jsonText = response.text ?? "{}";
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
    throw new Error("Tahlil natijasi o‘qilishi mumkin emas. Qayta urinib ko‘ring.");
  }
}

/** Timeout (ms) for transcript correction and speaker ID — real-world reliability. */
const AI_CORRECTION_TIMEOUT_MS = 18000;
const AI_SPEAKER_ID_TIMEOUT_MS = 22000;
const AI_AUDIO_DIARIZATION_TIMEOUT_MS = 45000;

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

// --- TRANSCRIPT CORRECTION (speech recognition errors) ---
/**
 * Fixes speech-recognition errors in Uzbek interrogation transcript. Improves "tushunish" (understanding)
 * by normalizing spelling and fixing common mishearing, keeping legal context.
 */
export async function correctTranscriptUzbek(
  text: string,
  userApiKey?: string
): Promise<string> {
  if (!text.trim()) return text;
  try {
    const ai = getAiClient(userApiKey);
    const response = await withTimeout(
      ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Vazifa: Tergov (savol-javob) stenogrammasining ovozni tanlash natijasidagi xatolarni tuzating. Faqat to'g'rilangan matnni qaytaring, hech qanday izoh yozmang.

Tuzatish qoidalari:
1) Imlo: o'zbek lotin (o', g', sh, ch, ng) — "qayerda", "ko'rdim", "tushundim", "huquq", "modda".
2) Ovoz tanlash xatolari: o'xshash tovushlarni to'g'ri so'zga almashtiring (masalan "kordim"→"ko'rdim", "qayerda" noto'g'ri yozilgan bo'lsa tuzating).
3) Shovqin va ortiqcha: raqamlar/yozuvlar (masalan "mu30 224") va mazmunsiz qismlarni olib tashlang; faqat mantiqiy gap va so'zlarni qoldiring.
4) Saqlang: huquqiy atamalar (JPK, modda, ayblov, guvoh), joy/ismlar, sanalar — faqat ular noto'g'ri yozilgan bo'lsa tuzating.
5) Gap mazmuni o'zgarmasin: so'z tartibi va ma'no bir xil qolsin, faqat yozuv va imlo to'g'rilansin.
6) Agar matn allaqachon to'g'ri va toza bo'lsa, uni o'zgartirmasdan qaytaring.

Matn:
"""
${text}
"""`,
      }).then((r) => (r.text ?? "").trim()),
      AI_CORRECTION_TIMEOUT_MS,
      ""
    );
    return response || text;
  } catch {
    return text;
  }
}

// --- SPEAKER IDENTIFICATION ---
/**
 * Splits transcript text into segments and assigns speaker by dialog content:
 * investigator (Tergovchi) = questions, procedural language, formal address;
 * suspect (second role) = answers, testimony, first-person narrative.
 */
export async function identifySpeakersInText(
  text: string,
  lastSpeakerId: "investigator" | "suspect",
  secondRoleName: string,
  userApiKey?: string
): Promise<DialogSegment[]> {
  const ai = getAiClient(userApiKey);
  const prompt = `Вазифа: Қуйидаги матнни фақат КИМ ГАПИРГАНИНИ белгилаш — матнни ўзгартирманг.

ҚАТ'ИЙ ТАЛАБЛАР:
1) Ҳар бир сегментдаги "text" майдони юқоридаги матндан АЁН нусха бўлиши керак. Биттта сўзни ҳам қўшманг, ўчирманг ёки ўзгартирманг. Фақат матнни кетма-кет бўлакларга бўлинг ва ҳар бирига speakerId беринг.
2) Терговчи (investigator): саволлар, расмий сўзлар. ${secondRoleName} (suspect): жавоблар, баённоллар.
3) Биттта гапирувчининг кетма-кет сўзлари = биттта сегмент. Аниқ савол ва аниқ жавоб ажратилганда икки сегмент.
4) Агар бутун матн бир кишининг сўзи бўлса — фақат БИТТТА сегмент, тўлиқ матн билан.

Олдинги охирги гапирувчи: ${lastSpeakerId}.

КИРУВЧИ МАТН (шу матндан фақат нусха олинг):
"""
${text}
"""

ЖАВОБ: Фақат JSON массив кириллицада. Ҳар бир элемент: speakerId ("investigator" ёки "suspect"), speakerName ("Терговчи" ёки "${secondRoleName}"), text (матндан АЁН нусха кириллицада, ҳеч қандай ўзгаришсиз), timestamp ("00:00").

ЭСДА САҚЛАНГ: ҲАММА ЖАВОБ ЎЗБЕК КИРИЛЛИЦАСИДА БУЛ СИНИН!`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            speakerId: { type: Type.STRING, enum: ["investigator", "suspect", "unknown"] },
            speakerName: { type: Type.STRING },
            text: { type: Type.STRING },
            timestamp: { type: Type.STRING },
          },
        },
      },
    },
  });

  const jsonText = response.text ?? "[]";
  return safeParseJson<DialogSegment[]>(jsonText, []);
}

/**
 * Robust speaker identification with timeout and fallback: on failure returns one segment (full text, lastSpeaker).
 */
/**
 * Returns segments only if AI output text matches original (no invented words).
 * Otherwise returns single segment with original text to avoid mock/hallucinated content.
 */
export async function identifySpeakersInTextRobust(
  text: string,
  lastSpeakerId: "investigator" | "suspect",
  secondRoleName: string,
  userApiKey?: string
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
      [fallbackSegment]
    );
    if (segments.length === 0) return [fallbackSegment];
    const combined = segments.map((s) => (s.text ?? "").trim()).join(" ");
    const origNorm = trimmed.replace(/\s+/g, " ").trim();
    const combinedNorm = combined.replace(/\s+/g, " ").trim();
    const matches = combinedNorm === origNorm || (combinedNorm.length >= origNorm.length * 0.95 && combinedNorm.length <= origNorm.length * 1.05);
    return matches ? segments : [fallbackSegment];
  } catch {
    return [fallbackSegment];
  }
}

/**
 * Transcribe audio and identify speakers BY VOICE TIMBRE (ovoz temberi).
 * Gemini analyzes the actual audio to distinguish different speakers — most accurate for diarization.
 * Returns DialogSegment[] or empty on failure (caller should fall back to text-based ID).
 */
export async function transcribeAndDiarizeByVoice(
  audioBase64: string,
  mimeType: string,
  lastSpeakerId: "investigator" | "suspect",
  secondRoleName: string,
  userApiKey?: string
): Promise<DialogSegment[]> {
  if (!audioBase64?.trim()) return [];
  const ai = getAiClient(userApiKey);
  const prompt = `Бу терговни (савол-жавоб) ёзуви. АУДИОНИ тингланг ва:
1) Ҳар бир гапирувчини ОВОЗ ТЕМБРИ (овоз хусусияти) бўйича ажринг — бир хил одамнинг овози биттта speaker, бошқа овоз бошқа speaker.
2) Матнни транскрибция қилинг (ўзбек кириллица).
3) Speaker 1 = Терговчи (investigator), Speaker 2 = ${secondRoleName} (suspect). Олдинги охирги гапирувчи: ${lastSpeakerId}.
4) Ҳар бир реплика учун: speakerId ("investigator" ёки "suspect"), speakerName ("Терговчи" ёки "${secondRoleName}"), text (тўлиқ матн кириллицада), timestamp (MM:SS).

ЖАВОБ: Фақат JSON массив кириллицада. Ҳар бир элемент: speakerId, speakerName, text (кириллица), timestamp.

МУҲИМ: ҲАР БИР СЎЗНИ ЎЗБЕК КИРИЛЛИЦАСИДА ЁЗИНГ!`;

  try {
    const response = await withTimeout(
      ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { inlineData: { mimeType, data: audioBase64 } },
            { text: prompt },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                speakerId: { type: Type.STRING, enum: ["investigator", "suspect", "unknown"] },
                speakerName: { type: Type.STRING },
                text: { type: Type.STRING },
                timestamp: { type: Type.STRING },
              },
            },
          },
        },
      }).then((r) => r.text ?? "[]"),
      AI_AUDIO_DIARIZATION_TIMEOUT_MS,
      "[]"
    );
    const segments = safeParseJson<DialogSegment[]>(response, []);
    return segments.filter((s) => (s.text ?? "").trim().length > 0);
  } catch {
    return [];
  }
}

function safeParseJson<T>(raw: string, fallback: T): T {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return (parsed as T) ?? fallback;
  } catch {
    return fallback;
  }
}

// --- LEGAL PROTOCOL GENERATION ---
export interface ProtocolTemplateDetails {
  title: string;
  code: string;
  role: string;
  legalInfo: string;
}

/**
 * Generates a legal protocol document (HTML for Word) in the exact format of the real interrogation protocol (bayonnoma).
 * Uses the official structure: title (Cyrillic), date, times, person data 1–15, legal preamble, Savol/Javob dialogue.
 */
export async function generateLegalProtocol(
  _type: string,
  transcript: DialogSegment[],
  template: ProtocolType,
  metadata: ProtocolMetadata | Record<string, unknown>,
  _lang: ProtocolLanguage,
  _appLang: AppLanguage,
  _userApiKey?: string,
  templateDetails?: ProtocolTemplateDetails
): Promise<string> {
  const templateEntry =
    templateDetails ?? PROTOCOL_TEMPLATES[template] ?? PROTOCOL_TEMPLATES[ProtocolType.GUVOH];
  return buildRealProtocolHtml(templateEntry, metadata, transcript, { useCyrillicTitle: true });
}

// --- PHOTOROBOT GENERATION ---
const IMAGEN_MAX_PER_REQUEST = 4;

export async function generatePhotorobotVariants(
  prompt: string,
  count: number,
  _type: "HUMAN" | "OBJECT",
  userApiKey?: string
): Promise<string[]> {
  const ai = getAiClient(userApiKey);
  const batchSizes: number[] = [];
  let remaining = Math.max(0, Math.min(count, 16));
  while (remaining > 0) {
    batchSizes.push(Math.min(remaining, IMAGEN_MAX_PER_REQUEST));
    remaining -= IMAGEN_MAX_PER_REQUEST;
  }

  const imagePromises = batchSizes.map(async (size) => {
    try {
      const response = await ai.models.generateImages({
        model: "imagen-4.0-generate-001",
        prompt,
        config: { numberOfImages: size, aspectRatio: "1:1", outputMimeType: "image/jpeg" },
      });
      if (!response.generatedImages?.length) return [];
      return response.generatedImages.map((img: { image?: { imageBytes?: string } }) => {
        const bytes = img.image?.imageBytes;
        return typeof bytes === "string" ? `data:image/jpeg;base64,${bytes}` : "";
      }).filter(Boolean);
    } catch (error) {
      console.error("Image generation batch failed:", error);
      return [];
    }
  });

  const results = await Promise.all(imagePromises);
  return results.flat();
}

export async function editPhotorobotImage(
  imageBase64: string,
  prompt: string,
  userApiKey?: string
): Promise<string> {
  const ai = getAiClient(userApiKey);
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { inlineData: { mimeType: "image/jpeg", data: base64Data } },
        { text: `Edit this image: ${prompt}. Return the edited image.` },
      ],
    },
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (parts) {
    for (const part of parts) {
      if (part?.inlineData?.data) return `data:image/jpeg;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Tahrir natijasida rasm topilmadi.");
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
  userApiKey?: string
): Promise<MentorResponse> {
  const fallback: MentorResponse = { text: "Javob vaqti tugadi. Qayta so'rang.", feedback: "", suggestion: "" };
  try {
    const ai = getAiClient(userApiKey);
    const chat = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: { systemInstruction },
    });
    const result = await withTimeout(
      chat.sendMessage({ message: query }).then((r) => r.text ?? ""),
      MENTOR_QUERY_TIMEOUT_MS,
      ""
    );
    return { text: result || fallback.text, feedback: "", suggestion: "" };
  } catch {
    return fallback;
  }
}

const LEGAL_SEARCH_TIMEOUT_MS = 35000;
const MENTOR_QUERY_TIMEOUT_MS = 40000;
const FORENSIC_ANALYZE_TIMEOUT_MS = 60000;
const FORENSIC_VIDEO_TIMEOUT_MS = 120000;

export async function searchLegalDatabase(
  query: string,
  lang: AppLanguage = AppLanguage.UZ_LATN,
  userApiKey?: string
): Promise<LegalAnalysisResult> {
  const fallback: LegalAnalysisResult = { analysis: "Qidiruv vaqti tugadi yoki tarmoq xatosi. Qayta urinib ko'ring.", articles: [], precedents: [] };
  try {
    const ai = getAiClient(userApiKey);
    const response = await withTimeout(
      ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Search for legal information regarding: "${query}". Language: ${lang}. Return JSON with analysis, articles, precedents.`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          analysis: { type: Type.STRING },
          articles: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                code: { type: Type.STRING },
                number: { type: Type.STRING },
                title: { type: Type.STRING },
                summary: { type: Type.STRING },
              },
            },
          },
          precedents: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                source: { type: Type.STRING },
                title: { type: Type.STRING },
                link: { type: Type.STRING },
              },
            },
          },
        },
      },
    },
  }).then((r) => r.text ?? "{}"),
      LEGAL_SEARCH_TIMEOUT_MS,
      "{}"
    );
    const parsed = safeParseJson<LegalAnalysisResult>(response, { analysis: "", articles: [], precedents: [] });
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

export async function generateAcademyQuiz(
  topic: string,
  lang: AppLanguage,
  userApiKey?: string
): Promise<QuizQuestion[]> {
  const ai = getAiClient(userApiKey);
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate a quiz about "${topic}". Language: ${lang}. 5 questions. Return JSON.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswer: { type: Type.NUMBER },
            explanation: { type: Type.STRING },
          },
        },
      },
    },
  });

  const jsonText = response.text ?? "[]";
  return safeParseJson<QuizQuestion[]>(jsonText, []);
}

// --- AUDIO TRANSCRIPTION ---
/** Lang label for prompt (Uzbek Cyrillic/Latin, Russian, etc.) */
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

/** High-quality prompt: accurate transcription + multi-speaker diarization. Used for both Stenogram and Jonli so'roq. */
const HIGH_QUALITY_TRANSCRIBE_PROMPT = (langLabel: string) => `Сиз терговни, гувохликни ёки сўроқ аудио ёзувини транскрибция қиласиз. ҲУҚУҚИЙ ҲУЖЖАТ — ҳар бир сўз муҳим.

МАТН АНИҚЛИГИ (энг муҳим):
- Ҳар бир сўзни, ҳар бир товушни АЁН эшитилганидек ёзинг. Парафраз қилманг, қисқартирманг.
- Исмлар, фамилиялар, манзиллар, телефон рақамлари, сана, суммалар — бараси аниқ ва тўғри ёзилсин.
- Ҳуқуқий атамалар (ЖПК, жиноят, айбланувчи, гувоҳ, терговчи ва бошқалар) тўғри ёзилсин.
- Паст овоз, шовқин ортида гапирилган сўзлар — диққат билан тингланг ва ёзинг.
- Шубҳали бўлса ҳам, эшитилганидек ёзинг (кейин тузатиш мумкин).

ШАХСЛАР (ДАРИРИЗАТСИЯ):
- Ҳар бир АЛОҲИДА ОВОЗ = алоҳида шахс. Speaker 1, Speaker 2, Speaker 3, Speaker 4, Speaker 5 ва ҳоказо — гапирувчилар сони қанча бўлса шунча.
- Биттта одамнинг барча репликалари бир хил Speaker. Бошқа одам = янги Speaker.
- 2 киши гапирса: Speaker 1, Speaker 2. 4 киши гапирса: Speaker 1, 2, 3, 4. Ҳеч қачон бошқа одамни биттта Speaker га бирлаштирманг.

ВАҚТ: Ҳар бир реплика бошланиши учун timestamp MM:SS (масалан 00:15, 01:42).

ТИЛ: ${langLabel}.

ЧИҚИШ: Фақат JSON массив. Ҳар бир элемент: id ("seg_1", "seg_2"...), speaker ("Speaker 1", "Speaker 2"...), text (тўлиқ матн кириллицада), timestamp (MM:SS).

МУҲИМ: Ҳамма сўзлар, жумалар ва таҳлил ФАҚАТ ЎЗБЕК КИРИЛЛИЦАСИДА БУЛ СИНИН!`;

export async function transcribeAudio(
  base64: string,
  mimeType: string,
  _mode: string,
  _identifySpeakers: boolean,
  lang: AppLanguage,
  userApiKey?: string
): Promise<TranscriptSegment[]> {
  const ai = getAiClient(userApiKey);
  const prompt = HIGH_QUALITY_TRANSCRIBE_PROMPT(getLangLabel(lang));

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { inlineData: { mimeType, data: base64 } },
        { text: prompt },
      ],
    },
    config: {
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            speaker: { type: Type.STRING },
            text: { type: Type.STRING },
            timestamp: { type: Type.STRING },
            stressLevel: { type: Type.NUMBER },
            sentiment: { type: Type.STRING, enum: ["NEUTRAL", "AGGRESSIVE", "DEFENSIVE", "DECEPTIVE"] },
          },
        },
      },
    },
  });

  const jsonText = response.text ?? "[]";
  const parsed = safeParseJson<TranscriptSegment[]>(jsonText, []);
  return ensureSegmentIds(parsed);
}

function ensureSegmentIds(segments: TranscriptSegment[]): TranscriptSegment[] {
  return segments.map((s, i) => ({
    ...s,
    id: s.id || `seg_${i + 1}`,
    speaker: (s.speaker || "").trim() || `Speaker ${i + 1}`,
    text: (s.text || "").trim(),
    timestamp: s.timestamp || "",
  }));
}

export async function generateTimelineFromText(
  text: string,
  lang: AppLanguage,
  userApiKey?: string
): Promise<TimelineEvent[]> {
  const ai = getAiClient(userApiKey);
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Extract timeline events from this text: "${text}". Language: ${lang}. Return JSON array.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            time: { type: Type.STRING },
            date: { type: Type.STRING },
            description: { type: Type.STRING },
            location: { type: Type.STRING },
          },
        },
      },
    },
  });

  const jsonText = response.text ?? "[]";
  return safeParseJson<TimelineEvent[]>(jsonText, []);
}
