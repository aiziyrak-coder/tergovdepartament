
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  ShieldCheck, Lock, User, ArrowRight, BrainCircuit, 
  Fingerprint, Eye, EyeOff, Shield, Zap, Globe, ScanLine, KeyRound, AlertCircle, CheckCircle2
} from 'lucide-react';
/** Расмий Тергов Департаменти логоси (қалқон, қилич, Ўзбекистон герби). */
const LOGO_SRC = '/tergov-logo.png';

interface LoginProps {
  onLogin: () => void;
}

const DEFAULT_DEMO_USER = "admin";
const DEFAULT_DEMO_PASS = "123";
const MAX_FAILED_ATTEMPTS = 5;

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>("");
  const [form, setForm] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [capsLock, setCapsLock] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);

  const envUser = typeof process !== "undefined" ? process.env.LOGIN_USER : "";
  const envPass = typeof process !== "undefined" ? process.env.LOGIN_PASSWORD : "";
  const validUsername = (envUser && envUser.trim()) || DEFAULT_DEMO_USER;
  const validPassword = (envPass && envPass.trim()) || DEFAULT_DEMO_PASS;
  const isLockedOut = failedAttempts >= MAX_FAILED_ATTEMPTS;

  // Detect CapsLock
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.getModifierState('CapsLock')) {
      setCapsLock(true);
    } else {
      setCapsLock(false);
    }
  };

  const simulateLoginProcess = () => {
    const steps = [
        t('login_step_1'),
        t('login_step_2'),
        t('login_step_3'),
        t('login_step_4')
    ];
    
    let currentStep = 0;
    
    const interval = setInterval(() => {
        if (currentStep < steps.length) {
            setLoadingStep(steps[currentStep]);
            currentStep++;
        } else {
            clearInterval(interval);
            onLogin();
        }
    }, 600);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const username = form.username.trim();
    const password = form.password;

    if (!username || !password) {
      setError(t('login_error_empty'));
      return;
    }

    if (isLockedOut) {
      setError(t('login_lockout'));
      return;
    }

    setLoading(true);
    setTimeout(() => {
      if (username === validUsername && password === validPassword) {
        setFailedAttempts(0);
        simulateLoginProcess();
      } else {
        setLoading(false);
        const next = failedAttempts + 1;
        setFailedAttempts(next);
        if (next >= MAX_FAILED_ATTEMPTS) {
          setError(t('login_lockout'));
        } else {
          setError(`${t('login_error_invalid')} ${MAX_FAILED_ATTEMPTS - next}.`);
        }
      }
    }, 800);
  };

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-[#F8FAFC] font-sans overflow-hidden relative selection:bg-uzblue/10 selection:text-uzblue">
      
      {/* ANIMATED BACKGROUND LAYERS (LIGHT THEME) */}
      <div className="absolute inset-0 z-0">
          {/* Subtle Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-blue-50/50"></div>
          
          {/* Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.03)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
          
          {/* Moving Particles/Orbs (Subtle) */}
          <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-uzblue/5 rounded-full blur-[80px] animate-[pulse_8s_infinite]"></div>
          <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-uzred/5 rounded-full blur-[80px] animate-[pulse_10s_infinite_reverse]"></div>
      </div>

      {/* MAIN CARD CONTAINER */}
      <div className="relative z-10 w-full max-w-[1100px] h-[80vh] bg-white border border-slate-200 rounded-[2.5rem] shadow-2xl flex overflow-hidden ring-4 ring-slate-50/50">
          
          {/* LEFT SIDE (Visual Identity - LIGHT) */}
          <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 relative overflow-hidden bg-slate-50/50">
              
              {/* Decorative Lines */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-uzblue via-cyan-400 to-transparent"></div>
              
              <div className="space-y-8 relative z-10">
                  {/* BIG LOGO CONTAINER */}
                  <div className="flex items-center gap-5">
                      <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-md flex items-center justify-center">
                          <img src={LOGO_SRC} alt="Ўзбекистон Республикаси IIV Тергов Департаменти" className="w-24 h-28 object-contain drop-shadow-sm" />
                      </div>
                      <div className="py-2">
                          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight leading-none mb-2">Тергов <br/><span className="text-uzblue">Департаменти</span></h1>
                          <div className="flex items-center gap-3">
                             <div className="h-0.5 w-6 bg-uzblue rounded-full"></div>
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Фарғона вилояти</p>
                          </div>
                      </div>
                  </div>

                  <div className="space-y-4 pt-6">
                      <h2 className="text-3xl font-black text-slate-800 leading-tight">
                          <span className="text-uzblue">Зиёрак AI</span> <br/>
                          Таҳлил Тизими
                      </h2>
                      <p className="text-slate-500 text-sm leading-relaxed max-w-sm font-medium">
                          Жинояларни очишда сунъий интеллект имкониятларидан фойдаланиш, 
                          рақамли далилларни таҳлил қилиш ва тергов жараёнини автоматлаштириш 
                          учун ягона миллий платформа.
                      </p>
                  </div>
              </div>

              {/* Feature Pills */}
              <div className="grid grid-cols-2 gap-3 relative z-10">
                  {[
                      { icon: BrainCircuit, label: "AI Таҳлил", color: "text-uzblue" },
                      { icon: Fingerprint, label: "Криминалистика", color: "text-emerald-600" },
                      { icon: Shield, label: "Киберҳимоя", color: "text-amber-500" },
                      { icon: Globe, label: "Глобал Қидирув", color: "text-purple-600" }
                  ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-uzblue/30 transition-all cursor-default">
                          <div className={`p-1.5 rounded-lg bg-slate-50 ${item.color}`}>
                              <item.icon size={16}/>
                          </div>
                          <span className="text-slate-600 text-[10px] font-black uppercase tracking-wide">{item.label}</span>
                      </div>
                  ))}
              </div>

              {/* Bottom Pattern */}
              <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-slate-100 to-transparent pointer-events-none"></div>
          </div>

          {/* RIGHT SIDE (Login Form - LIGHT) */}
          <div className="w-full lg:w-1/2 bg-white flex flex-col justify-center px-12 lg:px-20 relative">
              
              <div className="max-w-sm w-full mx-auto space-y-8 relative z-10">
                  
                  <div className="text-center lg:text-left">
                       {/* MOBILE LOGO DISPLAY */}
                       <div className="lg:hidden mb-8 flex flex-col items-center">
                          <div className="p-4 bg-white rounded-3xl shadow-lg border border-slate-100 mb-4 flex items-center justify-center">
                              <img src={LOGO_SRC} alt="Ўзбекистон Республикаси IIV Тергов Департаменти" className="w-24 h-28 object-contain" />
                          </div>
                          <h2 className="text-lg font-black text-slate-900 uppercase leading-tight mb-1">{t('login_dept')}</h2>
                       </div>

                      <h2 className="text-2xl font-black text-slate-800 mb-2">{t('login_title')}</h2>
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-wide">{t('login_subtitle')}</p>
                  </div>

                  {error && (
                      <div id="login-error" className="p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3 animate-in slide-in-from-top-2" role="alert">
                          <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" aria-hidden />
                          <p className="text-xs font-bold text-red-600">{error}</p>
                      </div>
                  )}

                  <form onSubmit={handleLogin} className="space-y-5">
                      <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                              {t('login_username')}
                          </label>
                          <div className="relative group">
                              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                  <User size={18} className="text-slate-400 group-focus-within:text-uzblue transition-colors"/>
                              </div>
                              <input
                                  type="text"
                                  autoComplete="username"
                                  aria-invalid={!!error}
                                  aria-describedby={error ? "login-error" : undefined}
                                  value={form.username}
                                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:border-uzblue focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all placeholder:text-slate-400"
                                  placeholder="admin"
                              />
                          </div>
                      </div>

                      <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                              <span>{t('login_password')}</span>
                              {capsLock && <span className="text-amber-500 flex items-center gap-1"><AlertCircle size={10}/> {t('login_caps_warning')}</span>}
                          </label>
                          <div className="relative group">
                              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                  <KeyRound size={18} className="text-slate-400 group-focus-within:text-uzblue transition-colors"/>
                              </div>
                              <input
                                  type={showPassword ? "text" : "password"}
                                  autoComplete="current-password"
                                  aria-invalid={!!error}
                                  value={form.password}
                                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                                  onKeyDown={handleKeyDown}
                                  className="w-full pl-11 pr-11 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:border-uzblue focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all placeholder:text-slate-400"
                                  placeholder="••••••••"
                              />
                              <button 
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                              >
                                  {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                              </button>
                          </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                          <label className="flex items-center gap-2 cursor-pointer group select-none">
                              <div className="relative">
                                  <input type="checkbox" className="peer sr-only"/>
                                  <div className="w-4 h-4 border-2 border-slate-300 rounded peer-checked:bg-uzblue peer-checked:border-uzblue transition-all"></div>
                                  <CheckCircle2 size={10} className="text-white absolute top-0.5 left-0.5 opacity-0 peer-checked:opacity-100 transition-opacity"/>
                              </div>
                              <span className="text-xs font-bold text-slate-500 group-hover:text-slate-700">Есаб қолиш</span>
                          </label>
                          <a href="#" className="text-xs font-bold text-uzblue hover:text-blue-700 transition-colors">Ёрдам керакми?</a>
                      </div>

                      <button 
                          type="submit"
                          disabled={loading || isLockedOut}
                          className="w-full py-4 bg-uzblue hover:bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-80 disabled:cursor-wait group relative overflow-hidden mt-4"
                      >
                          {loading && (
                              <div className="absolute inset-0 bg-blue-700 flex flex-col items-center justify-center z-10 transition-all">
                                  <div className="flex items-center gap-3">
                                      <ScanLine size={16} className="text-white animate-pulse"/>
                                      <span className="text-[10px] text-white animate-pulse">{loadingStep || "Тизимга ўланиш..."}</span>
                                  </div>
                                  <div className="absolute bottom-0 left-0 h-1 bg-white animate-[loading_1s_ease-in-out_infinite] w-full opacity-30"></div>
                              </div>
                          )}
                          <Lock size={16} className="text-blue-200 group-hover:text-white transition-colors"/>
                          {t('login_button')}
                          <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform"/>
                      </button>
                  </form>
                  
                  <div className="pt-6 border-t border-slate-100 flex items-center justify-center gap-2">
                       <ShieldCheck size={14} className="text-emerald-500"/>
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SSL 256-бит Шифрланган Алоқа</span>
                  </div>
              </div>
          </div>
      </div>
      
      {/* GLOBAL FOOTER (LIGHT) */}
      <div className="absolute bottom-6 text-center w-full z-10">
           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] hover:text-slate-600 transition-colors cursor-default">
               &copy; 2026 Ўзбекистон Республикаси Ички Ишлар Вазирлиги
           </p>
      </div>
    </div>
  );
};

export default Login;
