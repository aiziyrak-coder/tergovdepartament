import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  ArrowLeft, Save, StopCircle, Play, FileText, Radio, Gavel,
  Brain, Lightbulb, Loader2, MessageSquare,
} from "lucide-react";
import { ProtocolMetadata, ProtocolType, DialogSegment, AppLanguage, ProtocolLanguage, type ISpeechRecognition, type SpeechRecognitionEvent, type SpeechRecognitionErrorEvent } from "../../types";
import { useToast } from "../../contexts/ToastContext";
import { generateLegalProtocol } from "../../services/geminiService";
import { PROTOCOL_TEMPLATES, type ProtocolTemplateEntry } from "../../config/protocolTemplates";

/** Safe template getter: avoids crash when selectedTemplate is invalid (e.g. old draft). */
function getTemplateEntry(selected: ProtocolType | string): ProtocolTemplateEntry {
  return PROTOCOL_TEMPLATES[selected as ProtocolType] ?? PROTOCOL_TEMPLATES[ProtocolType.GUVOH];
}

const DRAFT_STORAGE_KEY = "smart_protocol_draft_v2";

/**
 * Remove noise from speech recognition (pure digits, garbage codes).
 */
function cleanChunk(text: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (!t) return "";
  const tokens = t.split(" ").filter((tok) => {
    if (/^\d+$/.test(tok)) return false;
    if (/[a-zA-Z\u0400-\u04FF]/.test(tok) && /\d{2,}/.test(tok)) return false;
    return true;
  });
  return tokens.join(" ").trim();
}


interface SmartProtocolProps {
  onBack: () => void;
}

// Extended Interface for specific fields
interface ExtendedMetadata extends ProtocolMetadata {
    idDocument: string;
    relationSuspect: string;
    relationVictim: string;
    deputyStatus: string;
    phoneNumber: string;
}

const SmartProtocol: React.FC<SmartProtocolProps> = ({ onBack }) => {
  const { toast } = useToast();

  // --- CONFIGURATION ---
  const [selectedTemplate, setSelectedTemplate] = useState<ProtocolType>(ProtocolType.GUVOH);
  const [metadata, setMetadata] = useState<ExtendedMetadata>({
      caseNumber: '300001/2025-15ГУ', city: 'Фарғона шаҳри', investigatorName: 'Ш.Р.Дадажонов', investigatorRank: 'подполковник', officeNumber: '118',
      date: new Date().toISOString().split('T')[0], startTime: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), endTime: '',
      personName: '', birthDate: '', birthPlace: '', nationality: '', citizenship: '', 
      education: '', workPlace: '', address: '', familyStatus: '', 
      conviction: '',
      idDocument: '',
      relationSuspect: '',
      relationVictim: '',
      deputyStatus: '',
      phoneNumber: '',
      participants: []
  });

  // --- AUDIO STATE ---
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  // --- TEXT STATE (simple continuous text) ---
  const [rawText, setRawText] = useState("");
  const [interimText, setInterimText] = useState("");
  const [recognitionLang, setRecognitionLang] = useState<"uz-UZ" | "uz" | "ru-RU">("uz-UZ");

  // --- REFS ---
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const recordingIntentRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopEverything = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (audioContextRef.current) audioContextRef.current.close();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
  }, []);

  useEffect(() => {
    return () => stopEverything();
  }, [stopEverything]);

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [rawText, interimText]);

  /** Draft: restore on mount if empty and draft exists. */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw || rawText.length > 0) return;
      const draft = JSON.parse(raw) as { rawText?: string; metadata?: ExtendedMetadata; template?: string };
      if (draft.rawText) {
        setRawText(draft.rawText);
        if (draft.metadata) setMetadata((prev) => ({ ...prev, ...draft.metadata }));
        if (draft.template != null && Object.prototype.hasOwnProperty.call(PROTOCOL_TEMPLATES, draft.template)) {
          setSelectedTemplate(draft.template as ProtocolType);
        }
        toast("Avvalgi qoralama tiklandi", "success");
      }
    } catch {
      // ignore
    }
  }, []);

  /** Draft: save rawText + metadata periodically (debounced). */
  useEffect(() => {
    if (rawText.length === 0) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({
          rawText,
          metadata: { ...metadata },
          template: selectedTemplate,
        }));
      } catch {
        // quota or disabled
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [rawText, metadata, selectedTemplate]);

  const startVisualizer = useCallback(async (): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const Ctx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return stream;
      const audioContext = new Ctx() as AudioContext;
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      const draw = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
        setAudioLevel(avg);
        animationFrameRef.current = requestAnimationFrame(draw);
      };
      draw();
      return stream;
    } catch (e) {
      console.error("Mic error", e);
      return null;
    }
  }, []);

  /**
   * Add final speech recognition text chunk - simply append to rawText.
   * No AI processing during recording, just accumulate text.
   */
  const addFinalChunk = useCallback((text: string) => {
    const t = cleanChunk(text);
    if (!t) return;
    setRawText((prev) => {
      const sep = prev.length > 0 ? " " : "";
      return prev + sep + t;
    });
    setInterimText("");
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      recordingIntentRef.current = false;
      setIsRecording(false);
      stopEverything();
      setAudioLevel(0);
      toast("So'roq to'xtatildi", "info");
      return;
    }

    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    if (!SpeechRecognition) {
      toast("Brauzer ovozni qo'llab-quvvatlamaydi. Chrome yoki Edge ishlatib ko'ring.", "error");
      return;
    }

    const recognition = new SpeechRecognition() as ISpeechRecognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = recognitionLang;
    recognition.maxAlternatives = 3;

    // Track if this is the first start (to show toast only once)
    let isFirstStart = true;

    recognition.onstart = () => {
      recordingIntentRef.current = true;
      setIsRecording(true);
      if (isFirstStart) {
        isFirstStart = false;
        startVisualizer();
        toast("Mikrofon yoqildi — gapiring, matn yoziladi", "success");
      }
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const alternatives: { transcript: string; confidence: number }[] = [];
        for (let j = 0; j < result.length; j++) {
          const alt = result[j];
          if (alt?.transcript != null)
            alternatives.push({ transcript: alt.transcript, confidence: Number(alt.confidence) || 0 });
        }
        const best = alternatives.length > 0 ? alternatives.reduce((b, a) => (a.confidence > b.confidence ? a : b), alternatives[0]) : null;
        if (result.isFinal) {
          const toAdd = (best ? best.transcript : result[0]?.transcript) ?? "";
          if (toAdd.trim()) addFinalChunk(toAdd);
        } else {
          const transcriptText = result[0]?.transcript ?? "";
          interim += transcriptText;
        }
      }
      const cleanedInterim = cleanChunk(interim);
      if (cleanedInterim) setInterimText(cleanedInterim);
    };

    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", e.error);
      if (e.error === "no-speech" || e.error === "aborted") return;
      const msg =
        e.error === "not-allowed"
          ? "Mikrofon ruxsati berilmagan. Brauzer sozlamalarida mikrofonni yoqing."
          : e.error === "network"
            ? "Internet aloqasini tekshiring. Ovoz tanlash tarmoq orqali ishlaydi."
            : e.error === "audio-capture"
              ? "Mikrofon topilmadi yoki boshqa dastur tomonidan ishlatilmoqda."
              : "Ovoz aniqlashda xatolik. Qayta urinib ko‘ring.";
      toast(msg, "error");
    };

    recognition.onend = () => {
      if (recognitionRef.current === recognition && recordingIntentRef.current) {
        // Add small delay before restart to prevent rapid cycling
        setTimeout(() => {
          if (recordingIntentRef.current && recognitionRef.current === recognition) {
            try {
              recognition.start();
            } catch (err) {
              console.error("Recognition restart failed:", err);
            }
          }
        }, 200);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isRecording, recognitionLang, stopEverything, startVisualizer, addFinalChunk, toast]);

  const clearDraftAndText = () => {
    if (isRecording) return;
    setRawText("");
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // ignore
    }
    toast("Qoralama tozalandi", "info");
  };

  const generateAndDownload = async () => {
      if (!rawText.trim()) {
        toast("Matn bo'sh. Avval so'roq o'tkazing.", "error");
        return;
      }
      setIsProcessing(true);
      try {
          const PROTOCOL_TIMEOUT_MS = 60000;
          const htmlContent = await Promise.race([
              generateLegalProtocol('DICTATION', [{ speakerId: 'unknown', speakerName: 'So\'roq matni', text: rawText.trim(), timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }], selectedTemplate, metadata, ProtocolLanguage.UZ_CYRILLIC, AppLanguage.UZ_CYRL, undefined, getTemplateEntry(selectedTemplate)),
              new Promise<string>((_, reject) => setTimeout(() => reject(new Error("timeout")), PROTOCOL_TIMEOUT_MS)),
          ]);

          const blob = new Blob([htmlContent], {type:'application/msword'});
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Bayonnoma_${metadata.personName || 'Nomsiz'}.doc`;
          a.click();
          URL.revokeObjectURL(url);
          toast("Protokol (.doc) shakllantirildi", "success");
      } catch (e) {
          const msg = (e as Error)?.message === "timeout" ? "Hujjat tayyorlash vaqti tugadi. Qayta urinib ko‘ring." : "Hujjat yaratishda xatolik.";
          toast(msg, "error");
      } finally {
          setIsProcessing(false);
      }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#F8FAFC] text-slate-900 font-sans overflow-hidden relative">
      
      {/* HEADER */}
      <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 shadow-sm z-30">
          <div className="flex items-center gap-6">
              <button type="button" onClick={onBack} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-all text-slate-500" aria-label="Orqaga">
                  <ArrowLeft size={20}/>
              </button>
              <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${isRecording ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-400'}`}>
                      <Radio className={isRecording ? 'animate-pulse' : ''} size={20}/>
                  </div>
                  <div>
                      <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest leading-none mb-1">Jonli So'roq</h2>
                      <div className="flex items-center gap-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                          <span className="flex items-center gap-1"><Brain size={10}/> Matn yozib boriladi</span>
                      </div>
                  </div>
              </div>
          </div>

          <div className="flex items-center gap-4">
              <div className="px-4 py-2 bg-slate-900 rounded-xl border border-slate-700 flex items-center gap-3 shadow-lg">
                   <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-slate-500'}`}></div>
                   <span className="text-white font-mono text-xs font-bold">{isRecording ? new Date().toLocaleTimeString() : '00:00:00'}</span>
              </div>
              <button type="button" onClick={clearDraftAndText} disabled={isRecording || !rawText.trim()} className="bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-600 px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-200 transition-all active:scale-95" title="Matnni tozalash">
                  Tozalash
              </button>
              <button type="button" onClick={generateAndDownload} disabled={isProcessing || !rawText.trim()} className="bg-uzblue hover:bg-blue-600 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-95" aria-label="Bayonnoma yuklab olish">
                   {isProcessing ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} 
                   {isProcessing ? 'SHAKLLANTIRILMOQDA...' : 'PROTOKOLNI YAKUNLASH'}
               </button>
          </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
          
          {/* LEFT: SETTINGS PANEL */}
          <div className="w-[380px] bg-white border-r border-slate-200 flex flex-col z-20 shadow-xl shadow-slate-200/50">
              <div className="p-5 flex-1 overflow-y-auto custom-scrollbar space-y-6">
                  
                  {/* Metadata fields */}
                  <div className="space-y-4">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><FileText size={12}/> Ish Tafsilotlari</h3>
                      <select value={Object.prototype.hasOwnProperty.call(PROTOCOL_TEMPLATES, selectedTemplate) ? selectedTemplate : ProtocolType.GUVOH} onChange={e=>setSelectedTemplate(e.target.value as ProtocolType)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] font-bold text-slate-700 outline-none">
                          {Object.entries(PROTOCOL_TEMPLATES).map(([k,v]) => <option key={k} value={k}>{v.title}</option>)}
                      </select>
                      
                      <div className="grid grid-cols-2 gap-2">
                          <div>
                              <label className="text-[9px] text-slate-400 font-bold uppercase">Jinoyat Ishi №</label>
                              <input value={metadata.caseNumber} onChange={e=>setMetadata({...metadata, caseNumber:e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold"/>
                          </div>
                          <div>
                              <label className="text-[9px] text-slate-400 font-bold uppercase">Xona №</label>
                              <input value={metadata.officeNumber} onChange={e=>setMetadata({...metadata, officeNumber:e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold"/>
                          </div>
                      </div>

                      <div className="pt-4 border-t border-slate-100">
                          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-uzblue">Tergovchi</h3>
                          <input value={metadata.investigatorName} onChange={e=>setMetadata({...metadata, investigatorName:e.target.value})} placeholder="F.I.SH" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold mb-2"/>
                          <input value={metadata.investigatorRank} onChange={e=>setMetadata({...metadata, investigatorRank:e.target.value})} placeholder="Unvon (Mas: Mayor)" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold"/>
                      </div>

                      <div className="pt-4 border-t border-slate-100">
                          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-uzred">
                              {getTemplateEntry(selectedTemplate).role} (Anketa)
                          </h3>
                          
                          <div className="space-y-2">
                              <input value={metadata.personName} onChange={e=>setMetadata({...metadata, personName:e.target.value})} placeholder="1. F.I.SH" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold"/>
                              <div className="grid grid-cols-2 gap-2">
                                <input value={metadata.birthDate} onChange={e=>setMetadata({...metadata, birthDate:e.target.value})} placeholder="2. Tug'ilgan sana" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold"/>
                                <input value={metadata.birthPlace} onChange={e=>setMetadata({...metadata, birthPlace:e.target.value})} placeholder="3. Tug'ilgan joy" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold"/>
                              </div>
                              <input value={metadata.nationality} onChange={e=>setMetadata({...metadata, nationality:e.target.value})} placeholder="4. Millati" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold"/>
                              <input value={metadata.citizenship} onChange={e=>setMetadata({...metadata, citizenship:e.target.value})} placeholder="5. Fuqaroligi" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold"/>
                              <input value={metadata.education} onChange={e=>setMetadata({...metadata, education:e.target.value})} placeholder="6. Ma'lumoti" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold"/>
                              <input value={metadata.workPlace} onChange={e=>setMetadata({...metadata, workPlace:e.target.value})} placeholder="7. Ish joyi" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold"/>
                              <input value={metadata.address} onChange={e=>setMetadata({...metadata, address:e.target.value})} placeholder="8. Yashash joyi" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold"/>
                              <input value={metadata.familyStatus} onChange={e=>setMetadata({...metadata, familyStatus:e.target.value})} placeholder="9. Oilaviy ahvoli" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold"/>
                              <input value={metadata.idDocument} onChange={e=>setMetadata({...metadata, idDocument:e.target.value})} placeholder="10. Hujjat turi" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold"/>
                              <input value={metadata.conviction} onChange={e=>setMetadata({...metadata, conviction:e.target.value})} placeholder="11. Sudlanganligi" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold"/>
                              <div className="grid grid-cols-2 gap-2">
                                <input value={metadata.relationSuspect} onChange={e=>setMetadata({...metadata, relationSuspect:e.target.value})} placeholder="12. Gumon. aloqasi" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold"/>
                                <input value={metadata.relationVictim} onChange={e=>setMetadata({...metadata, relationVictim:e.target.value})} placeholder="13. Jabr. aloqasi" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold"/>
                              </div>
                              <input value={metadata.deputyStatus} onChange={e=>setMetadata({...metadata, deputyStatus:e.target.value})} placeholder="14. Deputatligi" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold"/>
                              <input value={metadata.phoneNumber} onChange={e=>setMetadata({...metadata, phoneNumber:e.target.value})} placeholder="15. Telefon raqami" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold"/>
                          </div>
                      </div>
                  </div>
              </div>
          </div>

          {/* CENTER: CONTINUOUS TEXT DISPLAY */}
          <div className="flex-1 flex flex-col bg-[#F8FAFC] relative">
              <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none"></div>

              <div className="flex-1 overflow-y-auto p-6 relative z-10">
                  {!rawText && !interimText && (
                      <div className="h-full flex flex-col items-center justify-center opacity-30">
                          <Brain size={64} className="text-slate-400 mb-6"/>
                          <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest">Tizim Tayyor</h3>
                          <p className="text-sm font-medium text-slate-500 mt-2 text-center max-w-md">
                              "Start" tugmasini bosing. Gapirgan matn doimiy yozib boriladi.
                          </p>
                          <p className="text-xs text-slate-400 mt-4 text-center max-w-sm">
                              Ovozni yaxshi tanishi uchun: jimjit joyda gapiring, aniq va tushunarli, mikrofonga yaqinroq.
                          </p>
                      </div>
                  )}

                  {/* Editable textarea for the raw text */}
                  {(rawText || interimText) && (
                      <div className="h-full flex flex-col">
                          <div className="flex items-center justify-between mb-3">
                              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                  <MessageSquare size={12}/> So'roq Matni
                              </h3>
                              <span className="text-[10px] text-slate-400">
                                  {rawText.split(/\s+/).filter(Boolean).length} so'z
                              </span>
                          </div>
                          <textarea
                              value={rawText + (interimText ? (rawText ? " " : "") + interimText : "")}
                              onChange={(e) => {
                                  if (!isRecording) {
                                      setRawText(e.target.value);
                                  }
                              }}
                              readOnly={isRecording}
                              className={`flex-1 w-full p-4 text-base leading-relaxed font-medium text-slate-800 bg-white border border-slate-200 rounded-xl resize-none outline-none focus:ring-2 focus:ring-uzblue/30 focus:border-uzblue ${isRecording ? 'cursor-text' : ''}`}
                              placeholder="Matn bu yerda paydo bo'ladi..."
                          />
                          {interimText && isRecording && (
                              <div className="mt-2 px-3 py-1.5 bg-amber-50 text-amber-700 text-xs rounded-lg flex items-center gap-2">
                                  <span className="animate-pulse">●</span> Yozilmoqda...
                              </div>
                          )}
                      </div>
                  )}

                  {isProcessing && (
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                      <div className="px-4 py-2 bg-uzblue text-white text-xs font-bold rounded-full flex items-center gap-2 shadow-lg">
                        <Loader2 size={14} className="animate-spin" />
                        Bayonnoma shakllantirilmoqda...
                      </div>
                    </div>
                  )}

                  <div className="h-2 shrink-0" ref={scrollAnchorRef} />
              </div>

              {/* MASTER CONTROLS */}
              <div className="min-h-[7rem] border-t border-slate-200 bg-white p-4 flex flex-col items-center justify-center relative z-20 shadow-[0_-4px_24px_rgba(0,0,0,0.03)]">
                  {!isRecording && (
                      <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Ovoz tili:</span>
                          <select value={recognitionLang} onChange={(e) => setRecognitionLang(e.target.value as "uz-UZ" | "uz" | "ru-RU")} className="text-xs font-medium border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700">
                              <option value="uz-UZ">O‘zbek (uz-UZ)</option>
                              <option value="uz">O‘zbek (uz)</option>
                              <option value="ru-RU">Rus (ru-RU)</option>
                          </select>
                      </div>
                  )}
                  <div className="flex items-center gap-8 w-full max-w-lg justify-center relative">
                      {/* Audio Level Visualizer Ring */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                         <div className={`rounded-full border-4 border-uzblue/20 transition-all duration-75`} style={{ width: 80 + audioLevel/2 + 'px', height: 80 + audioLevel/2 + 'px', opacity: isRecording ? 1 : 0 }}></div>
                      </div>

                      <button 
                          onClick={toggleRecording}
                          className={`w-20 h-20 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all hover:scale-105 active:scale-95 border-[6px] -mt-10 relative z-10 ${isRecording ? 'bg-white border-red-500 shadow-red-200' : 'bg-slate-900 border-slate-100 shadow-slate-300'}`}
                      >
                          {isRecording ? (
                              <>
                                  <StopCircle size={32} className="text-red-500 fill-red-50"/>
                                  <span className="text-[9px] font-black text-red-500 mt-1 uppercase">Stop</span>
                              </>
                          ) : (
                              <>
                                  <Play size={32} className="text-white fill-white ml-1"/>
                                  <span className="text-[9px] font-black text-slate-400 mt-1 uppercase">Start</span>
                              </>
                          )}
                      </button>
                  </div>
              </div>
          </div>

          {/* RIGHT SIDE: TIPS & LEGAL INFO */}
          <div className="w-[300px] bg-white border-l border-slate-200 flex flex-col z-20">
              <div className="p-6 border-b border-slate-100">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                      <Lightbulb size={14}/> Yo'riqnoma
                  </h3>
                  <div className="space-y-3 text-[11px] text-slate-600">
                      <p className="flex items-start gap-2">
                          <span className="text-uzblue font-bold">1.</span>
                          Chap panelda shaxs ma'lumotlarini to'ldiring
                      </p>
                      <p className="flex items-start gap-2">
                          <span className="text-uzblue font-bold">2.</span>
                          "Start" bosib gapiring — matn avtomatik yoziladi
                      </p>
                      <p className="flex items-start gap-2">
                          <span className="text-uzblue font-bold">3.</span>
                          To'xtatib, matnni tahrirlashingiz mumkin
                      </p>
                      <p className="flex items-start gap-2">
                          <span className="text-uzblue font-bold">4.</span>
                          "Protokolni Yakunlash" — AI bayonnoma tuzadi
                      </p>
                  </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                  <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                          <Gavel size={14} className="text-amber-500"/>
                          <span className="text-[10px] font-black uppercase text-slate-400">Yuridik Ma'lumotnoma</span>
                      </div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Ish turi bo&apos;yicha</p>
                      <p className="text-[10px] font-black text-uzblue uppercase tracking-wide mb-2 border-b border-slate-100 pb-2">
                          {getTemplateEntry(selectedTemplate).title}
                      </p>
                      <p className="text-[10px] font-bold text-slate-600 leading-relaxed mb-1">
                          {getTemplateEntry(selectedTemplate).code}:
                      </p>
                      <p className="text-[9px] text-slate-500 leading-relaxed text-justify" key={selectedTemplate}>
                          {getTemplateEntry(selectedTemplate).legalInfo}
                      </p>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};
export default SmartProtocol;
