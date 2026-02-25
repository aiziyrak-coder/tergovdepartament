import React, { useState } from "react";
import { ArrowLeft, Settings as SettingsIcon, Globe, Shield, Database, Trash2, CheckCircle2, Lock } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { AppLanguage } from "../../types";
import { useToast } from "../../contexts/ToastContext";
import { ConfirmModal } from "../ui/ConfirmModal";

interface SettingsProps {
  onBack: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onBack }) => {
  const { language, setLanguage } = useLanguage();
  const { toast } = useToast();
  const [clearing, setClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClearCacheClick = () => setShowClearConfirm(true);
  const handleClearCacheConfirm = () => {
    setClearing(true);
    setShowClearConfirm(false);
    setTimeout(() => {
      const appKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("TERGOV_AI_")) appKeys.push(key);
      }
      appKeys.forEach((key) => localStorage.removeItem(key));
      setClearing(false);
      toast("Tizim keshlari tozalandi. Barcha mahalliy ma'lumotlar o'chirildi.", "success");
    }, 800);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#F8FAFC] overflow-hidden text-slate-900 font-sans">
      
      {/* HEADER */}
      <div className="h-20 border-b border-slate-200 bg-white flex items-center justify-between px-8 shrink-0 z-20 shadow-sm">
        <div className="flex items-center gap-4">
            <button type="button" onClick={onBack} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-500 transition-all" aria-label="Orqaga">
                <ArrowLeft size={20}/>
            </button>
            <div>
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-3 tracking-tight uppercase">
                    <SettingsIcon className="text-slate-600" size={24}/>
                    Тизим <span className="text-slate-600">Сохламалари</span>
                </h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Конфигуратсия ва Хавфсизлик</p>
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* LANGUAGE SETTINGS */}
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
             <div className="flex items-start gap-4 mb-6">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                    <Globe size={24}/>
                </div>
                <div>
                    <h3 className="text-lg font-black text-slate-800 uppercase">Интерфейс Тили</h3>
                    <p className="text-sm text-slate-500 font-medium">Платформанинг асосий ишчи тилини танланг.</p>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { id: AppLanguage.UZ_LATN, label: "O'zbek (Lotin)", flag: "🇺🇿" },
                  { id: AppLanguage.UZ_CYRL, label: "Ўзбек (Кирилл)", flag: "🇺🇿" },
                  { id: AppLanguage.RU, label: "Русский", flag: "🇷🇺" },
                  { id: AppLanguage.EN, label: "English", flag: "🇺🇸" },
                ].map((langItem) => (
                  <button
                    type="button"
                    key={langItem.id}
                    onClick={() => { setLanguage(langItem.id); toast(`Til o'zgartirildi: ${langItem.label}`, "success"); }}
                    className={`p-4 rounded-xl border-2 transition-all text-left flex items-center gap-3 ${language === langItem.id ? "border-uzblue bg-blue-50 ring-2 ring-blue-100" : "border-slate-100 bg-slate-50 hover:border-slate-300"}`}
                    aria-pressed={language === langItem.id}
                    aria-label={`Til: ${langItem.label}`}
                  >
                    <span className="text-2xl">{langItem.flag}</span>
                    <span className={`text-sm font-bold ${language === langItem.id ? 'text-uzblue' : 'text-slate-600'}`}>{langItem.label}</span>
                    {language === langItem.id && <CheckCircle2 size={16} className="ml-auto text-uzblue"/>}
                  </button>
                ))}
             </div>
          </div>

          {/* API & SECURITY SETTINGS */}
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
             <div className="flex items-start gap-4 mb-6">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                    <Shield size={24}/>
                </div>
                <div>
                    <h3 className="text-lg font-black text-slate-800 uppercase">Хавфсизлик ва API</h3>
                    <p className="text-sm text-slate-500 font-medium">Маълумотлар шифрланиши ва API калитлари бошқаруви.</p>
                </div>
             </div>

             <div className="space-y-4">
                {/* OpenRouter Key */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <Lock size={18} className="text-emerald-500"/>
                            <span className="text-sm font-bold text-slate-700 uppercase tracking-wide">OpenRouter API Калити</span>
                        </div>
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                            <CheckCircle2 size={12}/> Химояланган
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="password"
                            value="sk-or-v1-...EnvVariableProtected"
                            disabled
                            className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-400 cursor-not-allowed select-none"
                        />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 font-medium flex items-center gap-1">
                        <Shield size={10}/>
                        Матн, кўриш, расм генерацияси учун. openrouter.ai дан олинади.
                    </p>
                </div>
                {/* Gemini Key (audio) */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <Lock size={18} className="text-purple-500"/>
                            <span className="text-sm font-bold text-slate-700 uppercase tracking-wide">Gemini API Калити (Аудио)</span>
                        </div>
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                            <CheckCircle2 size={12}/> Химояланган
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="password"
                            value="AIza...EnvVariableProtected"
                            disabled
                            className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-400 cursor-not-allowed select-none"
                        />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 font-medium flex items-center gap-1">
                        <Shield size={10}/>
                        Аудио транскрипция учун (ўзбек тилини аниқ тушунади). aistudio.google.com дан бепул олинади.
                    </p>
                </div>
                {/* Groq Key (fallback) */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <Lock size={18} className="text-blue-500"/>
                            <span className="text-sm font-bold text-slate-700 uppercase tracking-wide">Groq API Калити (Захира)</span>
                        </div>
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                            <CheckCircle2 size={12}/> Химояланган
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="password"
                            value="gsk_...EnvVariableProtected"
                            disabled
                            className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-400 cursor-not-allowed select-none"
                        />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 font-medium flex items-center gap-1">
                        <Shield size={10}/>
                        Gemini калити йўқ бўлса ишлайди (захира). console.groq.com дан бепул олинади.
                    </p>
                </div>
             </div>
          </div>

          {/* DATA MANAGEMENT */}
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
             <div className="flex items-start gap-4 mb-6">
                <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
                    <Database size={24}/>
                </div>
                <div>
                    <h3 className="text-lg font-black text-slate-800 uppercase">Маълумотлар Базаси</h3>
                    <p className="text-sm text-slate-500 font-medium">Маъломотлар ва двох онлайн босимавчи файлларни дисюнтинг.</p>
                </div>
             </div>

             <div className="flex items-center justify-between p-6 bg-red-50 rounded-2xl border border-red-100">
                <div>
                    <h4 className="font-bold text-red-900 text-sm uppercase mb-1">Тизимни Тозалаш</h4>
                    <p className="text-xs text-red-700/80 font-medium">Барча сайланган хужжатлар, сожламалар ва кешни ўчириб юборди.</p>
                </div>
                <button
                    type="button"
                    onClick={handleClearCacheClick}
                    disabled={clearing}
                    className="px-6 py-3 bg-white border border-red-200 text-red-600 rounded-xl font-bold text-xs hover:bg-red-600 hover:text-white transition-all shadow-sm flex items-center gap-2 disabled:opacity-60"
                >
                    {clearing ? "Тозаланмоқда..." : <><Trash2 size={16}/> ТОЗАЛАШ</>}
                </button>
             </div>
          </div>

        </div>
      </div>

      <ConfirmModal
        open={showClearConfirm}
        title="Тизимни тозалаш"
        message="Барча маялли маълумотлар (архив, сожламалар, кеш) бутунлай ўчирилади. Бу амални қайтариб бўлмайди. Давом этасизми?"
        confirmLabel="Тозалаш"
        cancelLabel="Бекор қилиш"
        variant="danger"
        loading={clearing}
        onConfirm={handleClearCacheConfirm}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
};

export default Settings;
