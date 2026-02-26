

import React, { useState } from 'react';
import { searchLegalDatabase } from '../../services/geminiService';
import { LegalAnalysisResult } from '../../types';
import { Search, BookOpen, ExternalLink, Scale, ArrowLeft, Mic, Library, ScrollText, Loader2, Copy } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

interface LegalSearchProps { onBack: () => void; }

const LegalSearch: React.FC<LegalSearchProps> = ({ onBack }) => {
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<LegalAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) {
        toast("Κыдирув сўрўвини киритинг", "warning");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const data = await searchLegalDatabase(q);
      setResult(data);
      const hasContent = (data.analysis?.trim().length ?? 0) > 0 || (data.articles?.length ?? 0) > 0 || (data.precedents?.length ?? 0) > 0;
      toast(hasContent ? "Кыдирув натижалари тайор" : "Маълумот топилмади. Сўрўвни ўзгартиб қайта уриниб кўринг.", hasContent ? "success" : "info");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Қидирувда хатолик юз берди.";
      toast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#F8FAFC] font-sans relative overflow-hidden text-slate-900">
      
      {/* HEADER */}
      <div className="h-20 border-b border-slate-200 bg-white flex items-center justify-between px-8 shrink-0 z-20 shadow-sm">
            <div className="flex items-center gap-4">
                <button type="button" onClick={onBack} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-all text-slate-500" aria-label="Ортага">
                    <ArrowLeft size={20}/>
                </button>
                <div>
                    <h2 className="text-xl font-black text-slate-900 flex items-center gap-3 tracking-tight uppercase">
                        <Scale className="text-uzblue" size={24}/>
                        Йуридик <span className="text-uzblue">Кыдирув</span>
                    </h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Лекс.uz Базасидан Интеллектуал Кыдирув</p>
                </div>
            </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-8 relative z-10" aria-busy={loading} aria-live="polite">
          <div className="max-w-4xl mx-auto mb-10">
              <form onSubmit={handleSearch} className="relative group" aria-label="Yuridik qidiruv formasi">
                  <div className="relative flex items-center bg-white border border-slate-300 rounded-2xl p-2 shadow-sm focus-within:border-uzblue focus-within:ring-4 focus-within:ring-blue-50 transition-all">
                      <Search className="ml-4 text-slate-400" size={24}/>
                      <input
                          type="search"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Савол яки калит сўзни киритинг (Масалан: 'Фирибгарлик учун ёд ')..."
                          className="w-full bg-transparent p-4 text-lg text-slate-900 outline-none placeholder-slate-400 font-medium"
                          aria-label="Юридик қидирув сўрови"
                      />
                      <button type="submit" disabled={loading} className="bg-uzblue hover:bg-blue-600 text-white px-8 py-3 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center gap-2">
                          {loading ? <Loader2 className="animate-spin"/> : <Search size={18}/>} 
                          {loading ? 'ИЗЛАНМОЖДА' : 'КЫДИРУВ'}
                      </button>
                  </div>
              </form>
          </div>

          {result && (
              <div className="max-w-5xl mx-auto space-y-8 animate-in slide-in-from-bottom duration-500">
                  {!result.analysis?.trim() && (!result.articles?.length) && (!result.precedents?.length) && (
                      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
                          <p className="text-amber-800 font-medium">Ушбу сўрўв бўйича маълумот топилмади. Калит сўзларни ўзгартиб қайта қидиринг.</p>
                      </div>
                  )}
                  <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-lg relative overflow-hidden">
                      <div className="flex items-center gap-3 mb-6 relative z-10">
                          <div className="p-3 rounded-2xl bg-blue-50 text-uzblue border border-blue-100"><Library size={24}/></div>
                          <h3 className="text-xl font-bold text-slate-900 uppercase tracking-wide">AI Хулосаси</h3>
                      </div>
                      <p className="text-lg text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">{result.analysis}</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Тегишли Моддалар</h3>
                          {result.articles.map((art, idx) => (
                              <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-uzblue transition-all hover:shadow-md cursor-pointer group">
                                  <div className="flex justify-between mb-3">
                                      <span className="text-xs font-bold text-uzblue bg-blue-50 px-2 py-1 rounded group-hover:bg-uzblue group-hover:text-white transition-colors">{art.code} {art.number}</span>
                                  </div>
                                  <h4 className="text-slate-900 font-bold mb-2">{art.title}</h4>
                                  <p className="text-sm text-slate-600 leading-snug">{art.summary}</p>
                              </div>
                          ))}
                      </div>
                      <div className="space-y-4">
                          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Прецедентлар ва Манбалар</h3>
                          {result.precedents.map((prec, idx) => (
                              <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-uzgreen transition-all hover:shadow-md">
                                  <div className="flex items-center gap-2 mb-3 text-uzgreen text-xs font-bold uppercase"><ScrollText size={14}/> {prec.source}</div>
                                  <h4 className="text-slate-800 font-medium mb-2">{prec.title}</h4>
                                  {prec.link && <a href={prec.link} target="_blank" className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-bold"><ExternalLink size={12}/> Манбани очиш</a>}
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          )}
      </div>
    </div>
  );
};

export default LegalSearch;
