/** Document metadata stored with saved items (extensible key-value). */
export type DocumentMetadata = Record<string, string | number | boolean | null | undefined>;

export enum ModuleType {
  DASHBOARD = 'DASHBOARD',
  DOCUMENTS = 'DOCUMENTS',
  STENOGRAM = 'STENOGRAM', // Fayl tahlili
  PROTOCOL = 'PROTOCOL',   // Real vaqt so'roq
  PHOTOROBOT = 'PHOTOROBOT',
  MENTOR = 'MENTOR',       // Murabbiy + Yuridik qidiruv
  ACCIDENT_SIMULATION = 'ACCIDENT_SIMULATION', // Yangi modul
  TEMPLATES = 'TEMPLATES',
  SETTINGS = 'SETTINGS',   // Tizim sozlamalari
  LEGAL_SEARCH = 'LEGAL_SEARCH', // Yuridik qidiruv va Kodekslar
  STATISTICS = 'STATISTICS', // Statistika moduli
  PROFILE = 'PROFILE' // Foydalanuvchi profili
}

export enum AppLanguage {
  UZ_CYRL = 'UZ_CYRL',
  UZ_LATN = 'UZ_LATN',
  RU = 'RU',
  EN = 'EN'
}

export enum MentorMode {
  GENERAL = 'GENERAL',
  SIMULATOR = 'SIMULATOR',
  PLANNER = 'PLANNER',
  QUALIFIER = 'QUALIFIER',
  CRITIC = 'CRITIC',
  LEGAL_SEARCH = 'LEGAL_SEARCH'
}

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    webkitSpeechRecognition: new () => ISpeechRecognition;
    SpeechRecognition: new () => ISpeechRecognition;
    webkitAudioContext: typeof AudioContext | undefined;
    aistudio?: AIStudio;
  }
}

/** Minimal Web Speech API interface for speech recognition. */
export interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onaudiostart: (() => void) | null;
  onsoundstart: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
  onsoundend: (() => void) | null;
  onaudioend: (() => void) | null;
}

export interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

export interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

export interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

export interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

export interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

export type DocumentCategory = 'STENOGRAM' | 'PROTOCOL' | 'PHOTOROBOT' | 'VIDEO' | 'CASE_FILE' | 'ACCIDENT_REPORT';

export interface SavedDocument {
  id: string;
  title: string;
  category: DocumentCategory;
  createdAt: string;
  description?: string;
  content?: string;
  mediaUrl?: string;
  metadata?: DocumentMetadata;
  tags: string[];
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'info' | 'alert' | 'success';
}

export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: Date;
}

export interface TranscriptSegment {
  id: string;
  speaker: string;
  text: string;
  timestamp: string;
  stressLevel?: number;
  sentiment?: 'NEUTRAL' | 'AGGRESSIVE' | 'DEFENSIVE' | 'DECEPTIVE';
}

export interface PsychologicalProfile {
  stressLevel: number;
  deceptionRisk: string;
  emotionalState: string;
  analysis: string;
}

export interface TacticalInsight {
  title: string;
  description: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

export enum ProtocolType {
  GUVOH = "Гувоҳни сўроқ қилиш",
  JABRLANUVCHI = "Жабрланувчини сўроқ қилиш",
  GUMONLANUVCHI = "Гумон қилинувчини сўроқ қилиш",
  AYBLANUVCHI = "Айбланувчини сўроқ қилиш",
  YUZLASHTIRISH = "Юзлаштириш баённомаси"
}

export enum ProtocolLanguage {
  UZ_LATIN = "Ўзбек тили (Лотин)",
  UZ_CYRILLIC = "Ўзбек тили (Кирилл)",
  RUSSIAN = "Рус тили",
  KARAKALPAK = "Қорақалпоқ тили",
  ENGLISH = "Инглиз тили"
}

export interface Participant {
  id: string;
  role: string;
  name: string;
  isMain?: boolean;
}

export interface DialogSegment {
  speakerId: string;
  speakerName: string;
  text: string;
  timestamp: string;
}

export interface ProtocolMetadata {
  caseNumber: string;
  city: string;
  date: string;
  startTime: string;
  endTime: string;
  investigatorName: string;
  investigatorRank: string;
  officeNumber: string;
  personName: string;
  birthDate: string;
  birthPlace: string;
  nationality: string;
  citizenship: string;
  education: string;
  workPlace: string;
  address: string;
  familyStatus: string;
  conviction: string;
  lawyerName?: string;
  participants: Participant[];
}

export interface DocumentAnalysisResult {
  summary: string;
  vehicle1Type: string;
  vehicle2Type: string;
  estimatedSpeedV1: string;
  estimatedSpeedV2: string;
  weather: string;
  timeOfDay: string;
}

/** Result of AI-generated forensic video (Veo). */
export interface VideoGenerationResult {
  videoUri: string;
  explanation: string;
  technicalDetails: { model: string; prompt: string };
}

export interface LegalAnalysisResult {
  analysis: string;
  articles: Array<{
    code: string;
    number: string;
    title: string;
    summary: string;
  }>;
  precedents: Array<{
    source: string;
    title: string;
    link?: string;
  }>;
  sources?: Record<string, unknown>[];
}

export interface ExtractedEntity {
  name: string;
  type: string;
  description?: string;
}

export interface EvidenceNode {
  id: string;
  type: 'PERSON' | 'EVIDENCE';
  label: string;
  content: string;
  x: number;
  y: number;
}

export interface EvidenceEdge {
  id: string;
  source: string;
  target: string;
}

export interface InvestigationHypothesis {
  id: string;
  name: string;
  nodes: EvidenceNode[];
  edges: EvidenceEdge[];
  isActive: boolean;
}

export interface MentorResponse {
  text: string;
  feedback: string;
  suggestion: string;
}

export interface MentorReviewResult {
  summary: string;
  keyPoints?: string[];
  recommendations?: string[];
  riskLevel?: string;
}

export interface TimelineEvent {
  time: string;
  date: string;
  description: string;
  location: string;
}

// --- ACADEMY TYPES ---
export interface AcademyCourse {
    id: string;
    title: string;
    description: string;
    level: 'Boshlang\'ich' | 'O\'rta' | 'Yuqori';
    duration: string;
    topics: string[];
    icon: string;
}

export interface QuizQuestion {
    id: string;
    question: string;
    options: string[];
    correctAnswer: number; // index
    explanation: string;
}