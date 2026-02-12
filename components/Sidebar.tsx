
import React from 'react';
import { ModuleType } from '../types';
import { 
  LayoutDashboard, FileSignature, Mic2, UserSquare2, 
  GraduationCap, Settings, FolderArchive, Video, 
  LayoutTemplate, ShieldCheck, Activity, ChevronRight 
} from 'lucide-react';
import { IIVLogo } from './ui/IIVLogo';

interface SidebarProps {
  activeModule: ModuleType;
  setActiveModule: (m: ModuleType) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeModule, setActiveModule }) => {
  const menuItems = [
    { id: ModuleType.DASHBOARD, label: "Tahlil Markazi", sub: "Dashboard", icon: LayoutDashboard },
    { id: ModuleType.PROTOCOL, label: "Smart So'roq", sub: "Protokol", icon: FileSignature },
    { id: ModuleType.STENOGRAM, label: "Stenogramma", sub: "Audio", icon: Mic2 },
    { id: ModuleType.ACCIDENT_SIMULATION, label: "Ekspertiza", sub: "Video", icon: Video },
    { id: ModuleType.PHOTOROBOT, label: "Fotorobot", sub: "Qiyofa", icon: UserSquare2 },
    { id: ModuleType.TEMPLATES, label: "Namunalar", sub: "Shablon", icon: LayoutTemplate },
    { id: ModuleType.MENTOR, label: "Murabbiy", sub: "AI Yordam", icon: GraduationCap },
    { id: ModuleType.DOCUMENTS, label: "Yagona Arxiv", sub: "Ma'lumotlar", icon: FolderArchive },
  ];

  return (
    <div className="w-72 bg-[#0F172A] h-screen flex flex-col fixed left-0 top-0 z-50 shadow-2xl font-sans text-slate-300 border-r border-slate-800">
      
      {/* BRANDING SECTION */}
      <div className="h-24 flex items-center px-6 relative overflow-hidden shrink-0">
        {/* Glow Effect */}
        <div className="absolute top-0 left-10 w-32 h-32 bg-uzblue/20 rounded-full blur-[60px] pointer-events-none"></div>

        <div className="relative flex items-center gap-4 z-10 w-full">
            <div className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-xl backdrop-blur-sm border border-white/10 shadow-lg shrink-0">
                <IIVLogo className="w-7 h-7 object-contain drop-shadow" />
            </div>
            <div className="flex flex-col justify-center">
                <h1 className="text-white font-tech font-bold text-sm leading-none tracking-wide">IIV TERGOV <span className="text-uzblue">DEPARTAMENTI</span></h1>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Farg'ona viloyati</p>
            </div>
        </div>
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 py-4 space-y-2 overflow-y-auto custom-scrollbar px-4">
        <div className="px-2 mb-4 mt-2">
            <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
                <Activity size={10} className="text-uzgreen"/>
                <span>Asosiy Tizimlar</span>
            </div>
        </div>
        
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeModule === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveModule(item.id)}
              className={`w-full group flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-300 relative overflow-hidden ${
                isActive
                  ? 'bg-uzblue text-white shadow-glow-blue'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-4 relative z-10">
                  <Icon size={20} className={`${isActive ? 'text-white' : 'text-slate-500 group-hover:text-uzblue'} transition-colors`} strokeWidth={isActive ? 2.5 : 2} />
                  <div className="text-left">
                      <div className={`text-sm font-bold tracking-tight ${isActive ? 'font-tech text-base' : 'font-sans'}`}>{item.label}</div>
                      {isActive && <div className="text-[9px] opacity-80 uppercase tracking-wider font-medium">{item.sub}</div>}
                  </div>
              </div>
              
              {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-uzblue to-cyan-500 opacity-100 z-0"></div>
              )}
              
              {!isActive && <ChevronRight size={14} className="opacity-0 group-hover:opacity-50 -translate-x-2 group-hover:translate-x-0 transition-all"/>}
            </button>
          );
        })}
      </nav>

      {/* FOOTER SECTION */}
      <div className="p-4 bg-slate-900/50 border-t border-slate-800 space-y-2 shrink-0 backdrop-blur-sm">
        <button 
          onClick={() => setActiveModule(ModuleType.SETTINGS)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-xs font-bold ${activeModule === ModuleType.SETTINGS ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-500 hover:bg-slate-800 hover:text-white'}`}
        >
           <Settings size={18}/> 
           <span>Sozlamalar</span>
        </button>
        
        <div className="mt-2 pt-4 border-t border-slate-800 flex items-center justify-between px-2 opacity-60">
            <div className="flex gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-uzblue animate-pulse"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-white/20"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-uzgreen"></div>
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">v2.4.0 (Stable)</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
