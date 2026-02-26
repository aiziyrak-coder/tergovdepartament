import React, { useState, useCallback } from "react";
import { HashRouter } from "react-router-dom";
import { useLanguage } from "./contexts/LanguageContext";
import Dashboard from "./components/Dashboard";
import SmartProtocol from "./components/modules/SmartProtocol";
import Stenogram from "./components/modules/Stenogram";
import PhotoRobot from "./components/modules/PhotoRobot";
import VirtualMentor from "./components/modules/VirtualMentor";
import Documents from "./components/modules/Documents";
import AccidentVisualizer from "./components/modules/AccidentVisualizer";
import TemplatesGallery from "./components/modules/TemplatesGallery";
import LegalSearch from "./components/modules/LegalSearch";
import Settings from "./components/modules/Settings";
import Statistics from "./components/modules/Statistics";
import UserProfile from "./components/modules/UserProfile";
import Login from "./components/Login";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ConfirmModal } from "./components/ui/ConfirmModal";
import { ModuleType } from "./types";
import { LanguageProvider } from "./contexts/LanguageContext";
import { ToastProvider } from "./contexts/ToastContext";
import { ShieldCheck, Code2, Zap } from "lucide-react";

const MODULE_TO_HASH: Record<ModuleType, string> = {
  [ModuleType.DASHBOARD]: "dashboard",
  [ModuleType.DOCUMENTS]: "documents",
  [ModuleType.STENOGRAM]: "stenogram",
  [ModuleType.PROTOCOL]: "protocol",
  [ModuleType.PHOTOROBOT]: "photorobot",
  [ModuleType.MENTOR]: "mentor",
  [ModuleType.ACCIDENT_SIMULATION]: "accident",
  [ModuleType.TEMPLATES]: "templates",
  [ModuleType.SETTINGS]: "settings",
  [ModuleType.LEGAL_SEARCH]: "legal",
  [ModuleType.STATISTICS]: "statistics",
  [ModuleType.PROFILE]: "profile",
};
const HASH_TO_MODULE: Record<string, ModuleType> = Object.fromEntries(
  (Object.entries(MODULE_TO_HASH) as [ModuleType, string][]).map(([k, v]) => [v, k])
);

function hashToModule(hash: string): ModuleType {
  const cleaned = (hash || "").replace(/^#\/?/, "").trim() || "dashboard";
  return HASH_TO_MODULE[cleaned] ?? ModuleType.DASHBOARD;
}

function moduleToHash(m: ModuleType): string {
  return "#/" + (MODULE_TO_HASH[m] ?? "dashboard");
}

const MainApp: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const { t } = useLanguage();
  const [activeModule, setActiveModuleState] = useState<ModuleType>(() =>
    hashToModule(typeof window !== "undefined" ? window.location.hash : "")
  );
  const isFirstMount = React.useRef(true);

  const setActiveModule = useCallback((m: ModuleType) => {
    setActiveModuleState(m);
    const hash = moduleToHash(m);
    if (typeof window !== "undefined" && window.location.hash !== hash) {
      window.history.pushState({ module: m }, "", hash);
    }
  }, []);

  React.useEffect(() => {
    const handlePopState = () => {
      const next = hashToModule(window.location.hash);
      setActiveModuleState(next);
      if (!window.location.hash || window.location.hash === "#" || window.location.hash === "#/") {
        window.history.replaceState({ module: next }, "", moduleToHash(next));
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  React.useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      const h = moduleToHash(activeModule);
      if (typeof window !== "undefined" && window.location.hash !== h) {
        window.history.replaceState({ module: activeModule }, "", h);
      }
    }
  }, [activeModule]);

  const handleBack = useCallback(() => setActiveModule(ModuleType.DASHBOARD), [setActiveModule]);

  const renderContent = () => {
    switch (activeModule) {
      case ModuleType.DASHBOARD: return <Dashboard setModule={setActiveModule} />;
      case ModuleType.DOCUMENTS: return <Documents onBack={handleBack} />;
      case ModuleType.STENOGRAM: return <Stenogram onBack={handleBack} />;
      case ModuleType.PROTOCOL: return <SmartProtocol onBack={handleBack} />;
      case ModuleType.PHOTOROBOT: return <PhotoRobot onBack={handleBack} />;
      case ModuleType.MENTOR: return <VirtualMentor onBack={handleBack} onOpenTemplates={() => setActiveModule(ModuleType.TEMPLATES)} />;
      case ModuleType.ACCIDENT_SIMULATION: return <AccidentVisualizer onBack={handleBack} />;
      case ModuleType.TEMPLATES: return <TemplatesGallery onBack={handleBack} />;
      case ModuleType.SETTINGS: return <Settings onBack={handleBack} />;
      case ModuleType.LEGAL_SEARCH: return <LegalSearch onBack={handleBack} />;
      case ModuleType.STATISTICS: return <Statistics onBack={handleBack} />;
      case ModuleType.PROFILE: return <UserProfile onBack={handleBack} onLogout={onLogout} onSettings={() => setActiveModule(ModuleType.SETTINGS)} />;
      default: return <Dashboard setModule={setActiveModule} />;
    }
  };

  return (
      <div className="flex h-screen w-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-uzblue/10 overflow-hidden relative" role="application" aria-label="Ziyrak AI Tergov platformasi">
        <main className="flex-1 relative z-10 flex flex-col h-full w-full overflow-hidden bg-white" role="main">
            <div className="flex-1 w-full h-full overflow-hidden relative">
                <ErrorBoundary fallbackTitle="Modul xatosi" onReset={handleBack}>
                    {renderContent()}
                </ErrorBoundary>
            </div>
            <footer className="h-9 bg-white border-t border-slate-200 flex items-center justify-between px-6 shrink-0 z-50 select-none shadow-[0_-4px_20px_rgba(0,0,0,0.02)]" role="contentinfo">
                
                {/* Left: Copyright */}
                <div className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity cursor-default">
                    <ShieldCheck size={12} className="text-slate-400"/>
                    <span className="text-[10px] font-bold text-slate-500 tracking-tight">© 2026 Ziyrak AI Platformasi. {t('footer_rights')}.</span>
                </div>

                {/* Right: Credits */}
                <div className="flex items-center gap-6">
                    
                    {/* Developer: CDCGroup */}
                    <a href="https://cdcgroup.uz" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 group decoration-0 cursor-pointer">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-uzblue transition-colors">{t('dev_by')}</span>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-100 group-hover:border-uzblue/30 group-hover:bg-uzblue/5 transition-all">
                            <Code2 size={10} className="text-slate-400 group-hover:text-uzblue transition-colors"/>
                            <span className="text-[10px] font-black text-slate-700 group-hover:text-uzblue transition-colors">CDCGroup</span>
                        </div>
                    </a>

                    {/* Separator */}
                    <div className="h-3 w-px bg-slate-200 rotate-12"></div>

                    {/* Powered By: CraDev */}
                    <a href="https://cdcgroup.uz" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 group decoration-0 cursor-pointer">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-uzred transition-colors">{t('powered_by')}</span>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-100 group-hover:border-uzred/30 group-hover:bg-uzred/5 transition-all">
                            <Zap size={10} className="text-slate-400 group-hover:text-uzred transition-colors"/>
                            <span className="text-[10px] font-black text-slate-700 group-hover:text-uzred transition-colors">CraDev Company</span>
                        </div>
                    </a>

                </div>
            </footer>

        </main>
      </div>
  );
};

const AUTH_STORAGE_KEY = "TERGOV_AI_AUTH";

function loadStoredAuth(): boolean {
  try {
    return localStorage.getItem(AUTH_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function saveAuth(isLoggedIn: boolean) {
  try {
    if (isLoggedIn) localStorage.setItem(AUTH_STORAGE_KEY, "1");
    else localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(loadStoredAuth);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogin = useCallback(() => {
    setIsAuthenticated(true);
    saveAuth(true);
  }, []);

  const handleLogoutClick = () => setShowLogoutConfirm(true);
  const handleLogoutConfirm = () => {
    setShowLogoutConfirm(false);
    setIsAuthenticated(false);
    saveAuth(false);
  };

  return (
    <LanguageProvider>
      <ToastProvider>
        {isAuthenticated ? (
          <HashRouter>
            <MainApp onLogout={handleLogoutClick} />
          </HashRouter>
        ) : (
          <Login onLogin={handleLogin} />
        )}
        <ConfirmModal
          open={showLogoutConfirm}
          title="Тизимдан чиқиш"
          message="Ҳақиқатан ҳам тизимдан чиқмоқчимисиз? Сақланмаган маълумотлар йўқолиши мумкин."
          confirmLabel="Чиқиш"
          cancelLabel="Бекор Қилиш"
          variant="warning"
          onConfirm={handleLogoutConfirm}
          onCancel={() => setShowLogoutConfirm(false)}
        />
      </ToastProvider>
    </LanguageProvider>
  );
};

export default App;
