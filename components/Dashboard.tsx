
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { ModuleType, SavedDocument, NotificationItem } from '../types';
import { storageService } from '../services/storageService';
import { 
  Mic2, FileSignature, UserSquare2, GraduationCap, 
  Database, ArrowRight, Video, Bell,
  Activity, History, Star, ChevronRight, LayoutTemplate,
  ShieldCheck, FileText, Scale, X, Check, Info, AlertTriangle, CheckCircle2,
  Clock, CloudSun, CalendarDays, Signal
} from 'lucide-react';

interface DashboardProps {
  setModule: (m: ModuleType) => void;
}

/** Farg'ona shahri koordinatalari */
const FERGANA_LAT = 40.3864;
const FERGANA_LON = 71.7864;
const WEATHER_REFRESH_MS = 10 * 60 * 1000; // 10 min

/** Open-Meteo WMO weather_code → ўзбекча тавсиф */
function weatherCodeToLabel(code: number): string {
  if (code === 0) return "Ochiq, quyoshli";
  if (code >= 1 && code <= 3) return code === 1 ? "Asosan ochiq" : code === 2 ? "O'rtacha bulutli" : "Qorong'u bulutli";
  if (code >= 45 && code <= 48) return "Tuman";
  if (code >= 51 && code <= 67) return "Yomg'ir";
  if (code >= 71 && code <= 77) return "Qor";
  if (code >= 80 && code <= 82) return "Yomg'irli";
  if (code >= 85 && code <= 86) return "Qorli";
  if (code >= 95 && code <= 99) return "Momaqaldiroq";
  return "O'zgaruvchan";
}

interface WeatherState {
  temp: number | null;
  code: number | null;
  loading: boolean;
  error: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ setModule }) => {
  const { t } = useLanguage();
  const [time, setTime] = useState(new Date());
  const [recentDocs, setRecentDocs] = useState<SavedDocument[]>([]);
  const [weather, setWeather] = useState<WeatherState>({ temp: null, code: null, loading: true, error: false });

  // Notification State
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([
      { id: '1', title: "Янги топшириқ", message: "Бошқарма бошлиғидан 2 та янги иш келиб тушди.", time: "10:30", read: false, type: 'info' },
      { id: '2', title: "Муддати оз қолди", message: "№300002/2025 иш бўйича тергов муддати тугамоқда.", time: "09:15", read: false, type: 'alert' },
      { id: '3', title: "Тизим янгиланди", message: "Ziyrak AI 2.4 версиясига муваффақиятли ўтди.", time: "Кеча", read: true, type: 'success' },
  ]);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    try {
      setRecentDocs(storageService.getDocuments().slice(0, 5));
    } catch {
      setRecentDocs([]);
    }
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setWeather((w) => ({ ...w, loading: true, error: false }));
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${FERGANA_LAT}&longitude=${FERGANA_LON}&current=temperature_2m,weather_code`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Ob-havo yuklanmadi");
        const data = await res.json();
        const cur = data?.current;
        setWeather({
          temp: cur?.temperature_2m ?? null,
          code: cur?.weather_code ?? null,
          loading: false,
          error: false,
        });
      } catch {
        setWeather((w) => ({ ...w, loading: false, error: true }));
      }
    };
    fetchWeather();
    const interval = setInterval(fetchWeather, WEATHER_REFRESH_MS);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const clearAllNotifications = () => {
      setNotifications([]);
      setShowNotifications(false);
  };

  return (
    <div className="relative w-full h-full bg-[#F1F5F9] overflow-hidden flex flex-col font-sans text-slate-900">
      
      {/* BACKGROUND DECORATIONS */}
      <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-uzblue/10 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-slate-200 rounded-full blur-[100px]"></div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      </div>

      {/* TOP COMMAND BAR */}
      <header className="h-20 bg-white/60 backdrop-blur-xl border-b border-white/50 flex items-center justify-between px-8 shrink-0 z-30 shadow-sm transition-all sticky top-0">
          <div className="flex items-center gap-8">
              <div>
                  <h1 className="text-2xl font-tech font-bold text-slate-900 uppercase tracking-tight">{t('welcome')}, <span className="text-uzblue">Sarvar Ilkhomovich</span></h1>
              </div>

              <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50/80 border border-emerald-100 rounded-lg text-emerald-700">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                      <span className="text-[10px] font-black uppercase tracking-widest">{t('system_active')}</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50/80 border border-blue-100 rounded-lg text-blue-700">
                      <Signal size={12}/>
                      <span className="text-[10px] font-black uppercase tracking-widest">5ms Ping</span>
                  </div>
              </div>
          </div>

          <div className="flex items-center gap-6">
              <div className="flex items-center gap-4 relative">
                  <button 
                    type="button"
                    onClick={() => setShowNotifications(!showNotifications)}
                    className={`p-2.5 rounded-xl transition-all relative group ${showNotifications ? 'bg-uzblue text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-500 hover:border-uzblue hover:text-uzblue'}`}
                    aria-label={showNotifications ? "Bildirishnomalarni yopish" : "Bildirishnomalar"}
                    aria-expanded={showNotifications}
                  >
                      <Bell size={20}/>
                      {unreadCount > 0 && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>
                      )}
                  </button>

                  {/* NOTIFICATION PANEL */}
                  {showNotifications && (
                      <div className="absolute top-full right-0 mt-4 w-96 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 overflow-hidden z-50 animate-in slide-in-from-top-5 duration-200 ring-1 ring-black/5">
                          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                              <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                                  <Bell size={14}/> Bildirishnomalar
                              </h3>
                              {notifications.length > 0 && (
                                <button type="button" onClick={clearAllNotifications} className="text-[10px] font-bold text-slate-400 hover:text-red-500" aria-label="Barcha bildirishnomalarni tozalash">TOZALASH</button>
                              )}
                          </div>
                          <div className="max-h-80 overflow-y-auto custom-scrollbar">
                              {notifications.length === 0 ? (
                                  <div className="p-8 text-center text-slate-400">
                                      <Bell size={32} className="mx-auto mb-2 opacity-50"/>
                                      <p className="text-xs font-medium">Yangi xabarlar yo'q</p>
                                  </div>
                              ) : (
                                  notifications.map(note => (
                                      <div key={note.id} className={`p-4 border-b border-slate-50 hover:bg-blue-50/30 transition-colors relative ${!note.read ? 'bg-blue-50/50' : ''}`}>
                                          <div className="flex items-start gap-3">
                                              <div className={`mt-0.5 ${
                                                  note.type === 'alert' ? 'text-red-500' : 
                                                  note.type === 'success' ? 'text-green-500' : 'text-blue-500'
                                              }`}>
                                                  {note.type === 'alert' ? <AlertTriangle size={16}/> : 
                                                   note.type === 'success' ? <CheckCircle2 size={16}/> : <Info size={16}/>}
                                              </div>
                                              <div className="flex-1">
                                                  <div className="flex justify-between items-start mb-1">
                                                      <h4 className={`text-xs font-bold ${!note.read ? 'text-slate-900' : 'text-slate-600'}`}>{note.title}</h4>
                                                      <span className="text-[9px] font-mono text-slate-400">{note.time}</span>
                                                  </div>
                                                  <p className="text-xs text-slate-500 leading-snug">{note.message}</p>
                                                  {!note.read && (
                                                      <button type="button" onClick={() => markAsRead(note.id)} className="mt-2 text-[10px] font-bold text-uzblue hover:underline flex items-center gap-1" aria-label="O'qilgan deb belgilash">
                                                          <Check size={10}/> O'qildi deb belgilash
                                                      </button>
                                                  )}
                                              </div>
                                          </div>
                                      </div>
                                  ))
                              )}
                          </div>
                      </div>
                  )}
                  
                  <div className="h-8 w-px bg-slate-200"></div>

                  <div className="flex items-center gap-3">
                      <div className="text-right hidden xl:block">
                          <div className="text-sm font-black font-tech text-slate-800 tabular-nums leading-none mb-1">{time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{new Date().toLocaleDateString('uz-UZ', {weekday: 'short', day: 'numeric', month: 'short'})}</div>
                      </div>
                      <div 
                        onClick={() => setModule(ModuleType.PROFILE)}
                        className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 border border-white shadow-md overflow-hidden relative cursor-pointer hover:ring-2 hover:ring-uzblue hover:ring-offset-2 transition-all"
                      >
                          <img src="https://ui-avatars.com/api/?name=Sarvar+Ilkhomovich&background=0099B5&color=fff&bold=true" className="w-full h-full object-cover"/>
                          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-uzgreen border-2 border-white rounded-full"></div>
                      </div>
                  </div>
              </div>
          </div>
      </header>

      {/* MAIN LAYOUT */}
      <main className="flex-1 overflow-hidden flex relative z-10 p-6 gap-6">
          
          {/* LEFT: BENTO GRID DASHBOARD */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="max-w-[1400px] mx-auto space-y-6">
                  
                  {/* Weather & Date Status Bar */}
                  <div className="w-full bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-50/30 to-transparent pointer-events-none"></div>
                      
                      <div className="relative z-10 flex items-center gap-6 w-full md:w-auto">
                          <div className="p-3 bg-amber-50 text-amber-500 rounded-2xl border border-amber-100">
                             <CloudSun size={32}/>
                          </div>
                          <div>
                              <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Ob-havo</div>
                              <div className="flex items-baseline gap-3">
                                {weather.loading ? (
                                  <span className="text-lg font-bold text-slate-400">Yuklanmoqda...</span>
                                ) : weather.error ? (
                                  <span className="text-sm font-bold text-slate-500">Фарғона — маълумот йўқ</span>
                                ) : (
                                  <>
                                    <span className="text-3xl font-tech font-bold text-slate-800">
                                      {weather.temp != null ? `${Math.round(weather.temp)}°C` : '—'}
                                    </span>
                                    <span className="text-sm font-bold text-slate-500">
                                      {weather.code != null ? weatherCodeToLabel(weather.code) : ''}, Farg'ona
                                    </span>
                                  </>
                                )}
                              </div>
                          </div>
                      </div>

                      <div className="w-full h-px bg-slate-100 my-4 md:hidden"></div>

                      <div className="relative z-10 flex items-center gap-6 w-full md:w-auto justify-end">
                           <div className="text-right">
                              <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Bugungi Sana</div>
                              <div className="text-lg font-bold text-slate-800 capitalize">{new Date().toLocaleDateString('uz-UZ', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
                           </div>
                           <div className="p-3 bg-uzblue/5 text-uzblue rounded-2xl border border-uzblue/10">
                               <CalendarDays size={32}/>
                           </div>
                      </div>
                  </div>

                  {/* MODULES BENTO GRID */}
                  <div>
                      <h3 className="text-sm font-black text-slate-800 uppercase mb-4 flex items-center gap-2">
                          <ShieldCheck className="text-uzblue" size={18}/>
                          {t('sec_intel_title')}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                          
                          {/* 1. SMART PROTOCOL */}
                          <div onClick={() => setModule(ModuleType.PROTOCOL)} className="group bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:border-uzblue/50 transition-all cursor-pointer relative overflow-hidden h-60 flex flex-col justify-between">
                              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                  <FileSignature size={120} className="text-uzblue"/>
                              </div>
                              <div className="w-12 h-12 bg-blue-50 text-uzblue rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                  <FileSignature size={24}/>
                              </div>
                              <div>
                                  <h4 className="text-xl font-tech font-bold text-slate-900 group-hover:text-uzblue transition-colors">{t('protocol')}</h4>
                                  <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed">
                                      Ovozli so'roq jarayonini avtomatik bayonnomaga aylantirish va yuridik tahlil.
                                  </p>
                              </div>
                              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 group-hover:text-uzblue mt-4">
                                  {t('settings')} <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform"/>
                              </div>
                          </div>

                          {/* 2. STENOGRAM */}
                          <div onClick={() => setModule(ModuleType.STENOGRAM)} className="group bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:border-purple-500/50 transition-all cursor-pointer relative overflow-hidden h-60 flex flex-col justify-between">
                              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                  <Mic2 size={120} className="text-purple-600"/>
                              </div>
                              <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                  <Mic2 size={24}/>
                              </div>
                              <div>
                                  <h4 className="text-xl font-tech font-bold text-slate-900 group-hover:text-purple-600 transition-colors">{t('stenogram')}</h4>
                                  <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed">
                                      {t('card_steno_desc')}
                                  </p>
                              </div>
                              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 group-hover:text-purple-600 mt-4">
                                  {t('settings')} <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform"/>
                              </div>
                          </div>

                          {/* 3. EXPERTIZE */}
                          <div onClick={() => setModule(ModuleType.ACCIDENT_SIMULATION)} className="group bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:border-red-500/50 transition-all cursor-pointer relative overflow-hidden h-60 flex flex-col justify-between">
                              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                  <Video size={120} className="text-uzred"/>
                              </div>
                              <div className="w-12 h-12 bg-red-50 text-uzred rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                  <Video size={24}/>
                              </div>
                              <div>
                                  <h4 className="text-xl font-tech font-bold text-slate-900 group-hover:text-uzred transition-colors">Видео Экспертиза</h4>
                                  <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed">
                                      ЁТҲ ва воқеа жойини 3D форматда визуал реконструкция қилиш (AI Simulation).
                                  </p>
                              </div>
                              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 group-hover:text-uzred mt-4">
                                  {t('settings')} <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform"/>
                              </div>
                          </div>
                          
                          {/* 4. PHOTOROBOT */}
                          <div onClick={() => setModule(ModuleType.PHOTOROBOT)} className="group bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-500/50 transition-all cursor-pointer relative overflow-hidden h-60 flex flex-col justify-between">
                              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                  <UserSquare2 size={120} className="text-indigo-600"/>
                              </div>
                              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                  <UserSquare2 size={24}/>
                              </div>
                              <div>
                                  <h4 className="text-xl font-tech font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">Fotorobot</h4>
                                  <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed">
                                      Guvoh ko'rsatmalari asosida gumonlanuvchi qiyofasini tiklash.
                                  </p>
                              </div>
                              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 group-hover:text-indigo-600 mt-4">
                                  {t('settings')} <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform"/>
                              </div>
                          </div>

                          {/* 5. MENTOR */}
                          <div onClick={() => setModule(ModuleType.MENTOR)} className="group bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:border-amber-500/50 transition-all cursor-pointer relative overflow-hidden h-60 flex flex-col justify-between">
                              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                  <GraduationCap size={120} className="text-amber-500"/>
                              </div>
                              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                  <GraduationCap size={24}/>
                              </div>
                              <div>
                                  <h4 className="text-xl font-tech font-bold text-slate-900 group-hover:text-amber-600 transition-colors">Virtual Murabbiy</h4>
                                  <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed">
                                      Tergov taktikasi, strategiyasi va yuridik maslahatlar markazi.
                                  </p>
                              </div>
                              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 group-hover:text-amber-600 mt-4">
                                  {t('settings')} <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform"/>
                              </div>
                          </div>

                          {/* 6. ARCHIVE */}
                          <div onClick={() => setModule(ModuleType.DOCUMENTS)} className="group bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:border-emerald-500/50 transition-all cursor-pointer relative overflow-hidden h-60 flex flex-col justify-between">
                              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                  <Database size={120} className="text-emerald-600"/>
                              </div>
                              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                  <Database size={24}/>
                              </div>
                              <div>
                                  <h4 className="text-xl font-tech font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">Arxiv & Hujjatlar</h4>
                                  <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed">
                                      Barcha tergov hujjatlari va dalillarning elektron himoyalangan arxivi.
                                  </p>
                              </div>
                              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 group-hover:text-emerald-600 mt-4">
                                  {t('settings')} <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform"/>
                              </div>
                          </div>

                      </div>
                  </div>
              </div>
          </div>

          {/* RIGHT SIDEBAR: INTELLIGENCE PANEL */}
          <div className="w-[350px] bg-white rounded-3xl border border-white/50 shadow-xl overflow-hidden flex flex-col backdrop-blur-md">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <History size={14}/> Oxirgi Faoliyat
                  </h3>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                   {recentDocs.length === 0 ? (
                      <div className="text-center py-10 opacity-40">
                          <FileText size={48} className="mx-auto mb-2 text-slate-400"/>
                          <p className="text-xs font-bold text-slate-500">Hozircha bo'sh</p>
                      </div>
                   ) : (
                      recentDocs.map((item) => (
                          <div key={item.id} onClick={() => setModule(ModuleType.DOCUMENTS)} className="group p-4 rounded-2xl bg-white border border-slate-100 hover:border-uzblue hover:shadow-lg transition-all cursor-pointer relative overflow-hidden">
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-200 group-hover:bg-uzblue transition-colors"></div>
                              <div className="flex justify-between items-start mb-2 pl-2">
                                  <span className="text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-uzblue transition-colors">{item.title}</span>
                              </div>
                              <div className="flex justify-between items-center pl-2">
                                  <span className="text-[10px] text-slate-400 uppercase font-bold">{item.category}</span>
                                  <span className="text-[9px] font-mono text-slate-400">{new Date(item.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                              </div>
                          </div>
                      ))
                   )}
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                      <Star size={14}/> {t('dev_by')} Ҳаволалар
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                      <button type="button" onClick={() => setModule(ModuleType.TEMPLATES)} className="p-3 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 hover:text-uzblue hover:border-uzblue transition-all shadow-sm">
                          {t('templates')}
                      </button>
                      <button type="button" onClick={() => setModule(ModuleType.LEGAL_SEARCH)} className="p-3 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 hover:text-uzblue hover:border-uzblue transition-all shadow-sm">
                          {t('legal_search')}
                      </button>
                      <button type="button" onClick={() => setModule(ModuleType.STATISTICS)} className="p-3 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 hover:text-uzblue hover:border-uzblue transition-all shadow-sm">
                          {t('settings')}
                      </button>
                      <button type="button" onClick={() => setModule(ModuleType.SETTINGS)} className="p-3 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 hover:text-uzblue hover:border-uzblue transition-all shadow-sm">
                          {t('settings')}
                      </button>
                  </div>
              </div>
          </div>

      </main>
    </div>
  );
};

export default Dashboard;
