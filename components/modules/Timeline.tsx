import React, { useState } from "react";
import { Clock, ArrowLeft, RefreshCw, Loader2, MapPin } from "lucide-react";
import { generateTimelineFromText } from "../../services/geminiService";
import { TimelineEvent } from "../../types";
import { useLanguage } from "../../contexts/LanguageContext";
import { useToast } from "../../contexts/ToastContext";

interface TimelineProps {
  onBack: () => void;
}

const Timeline: React.FC<TimelineProps> = ({ onBack }) => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [inputText, setInputText] = useState("");
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    const text = inputText.trim();
    if (!text) {
      toast("Воқеа матнини киритинг", "warning");
      return;
    }
    setLoading(true);
    setEvents([]);
    const TIMEOUT_MS = 30000;
    try {
      const result = await Promise.race([
        generateTimelineFromText(text, language),
        new Promise<TimelineEvent[]>((_, reject) =>
          setTimeout(() => reject(new Error("Xronologiya vaqti tugadi. Qayta urinib ko'ring.")), TIMEOUT_MS)
        ),
      ]);
      setEvents(result);
      toast(result.length > 0 ? `Хронология: ${result.length} та воқеа` : "Воқеалар топилмади", result.length > 0 ? "success" : "info");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Хронология яратишда хатолик.";
      toast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#F8FAFC] font-sans p-6 text-slate-900">
       <div className="flex items-center gap-4 mb-6">
            <button type="button" onClick={onBack} className="p-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-500 transition-all" aria-label="Ортага"><ArrowLeft size={20}/></button>
            <h2 className="text-2xl font-bold flex items-center gap-3 text-slate-800"><Clock className="text-uzblue" size={28}/> Хронология <span className="text-uzblue">AI</span></h2>
       </div>

       <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
          <div className="w-full lg:w-1/3 flex flex-col bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <textarea className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm outline-none resize-none mb-4 focus:border-uzblue" placeholder="Воқеа тафсилотларини киритинг (sana, vaqt, joy, hodisa)..." value={inputText} onChange={(e) => setInputText(e.target.value)} aria-label="Воқеа матни" />
              <button type="button" onClick={handleGenerate} disabled={loading} className="w-full py-4 bg-uzblue text-white rounded-xl font-bold shadow-lg shadow-blue-200 flex items-center justify-center gap-2 disabled:opacity-60">
                  {loading ? <Loader2 className="animate-spin" size={20}/> : <RefreshCw size={20}/>} Хронология яратиш
              </button>
          </div>

          <div className="w-full lg:w-2/3 bg-white border border-slate-200 rounded-2xl p-8 overflow-y-auto custom-scrollbar relative">
              {events.length > 0 ? (
                  <div className="relative border-l-2 border-slate-200 ml-4 space-y-8">
                      {events.map((evt, idx) => (
                          <div key={idx} className="relative pl-8 group">
                              <div className="absolute -left-[9px] top-2 w-4 h-4 rounded-full border-2 bg-white border-uzblue"></div>
                              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl hover:border-uzblue transition-all shadow-sm">
                                  <div className="flex justify-between mb-2">
                                      <span className="text-xl font-bold text-slate-800 font-mono">{evt.time}</span>
                                      <span className="text-xs text-slate-500">{evt.date}</span>
                                  </div>
                                  <p className="text-sm text-slate-700 mb-2">{evt.description}</p>
                                  <span className="text-[10px] bg-white border border-slate-200 px-2 py-1 rounded flex items-center gap-1 w-fit"><MapPin size={10}/> {evt.location}</span>
                              </div>
                          </div>
                      ))}
                  </div>
              ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-50"><Clock size={48} className="mb-4"/><p>Маълумот кутилмоқда...</p></div>
              )}
          </div>
       </div>
    </div>
  );
};
export default Timeline;