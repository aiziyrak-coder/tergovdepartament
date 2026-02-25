
import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { ArrowLeft, User, Shield, Key, LogOut, Award, Briefcase, FileCheck, Star, Settings } from 'lucide-react';

interface UserProfileProps { 
    onBack: () => void;
    onLogout: () => void;
    onSettings: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ onBack, onLogout, onSettings }) => {
  const { t } = useLanguage();
  return (
    <div className="w-full h-full flex flex-col bg-[#F8FAFC] overflow-hidden text-slate-900 font-sans">
       {/* Header */}
       <div className="h-20 border-b border-slate-200 bg-white flex items-center justify-between px-8 shrink-0 z-20 shadow-sm">
            <div className="flex items-center gap-4">
                <button type="button" onClick={onBack} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-all text-slate-500" aria-label="Orqaga">
                    <ArrowLeft size={20}/>
                </button>
                <div>
                    <h2 className="text-xl font-black text-slate-900 flex items-center gap-3 tracking-tight uppercase">
                        <User className="text-slate-700" size={24}/>
                        {t('settings')} <span className="text-slate-700">Kabinet</span>
                    </h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{t('dev_by')} ma'lumotlari</p>
                </div>
            </div>
            
            <button
                type="button"
                onClick={onLogout}
                className="px-5 py-2.5 bg-red-50 text-red-600 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-red-600 hover:text-white transition-all shadow-sm"
                aria-label="Tizimdan chiqish"
            >
                <LogOut size={16}/> TIZIMDAN CHIQISH
            </button>
       </div>
       
       <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
           <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
               
               {/* Left: Profile Card */}
               <div className="lg:col-span-1 space-y-6">
                   <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
                       <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-uzblue to-cyan-500"></div>
                       <div className="w-24 h-24 rounded-2xl bg-white p-1 shadow-lg relative z-10 -mt-2">
                           <img src="https://ui-avatars.com/api/?name=Sarvar+Ilkhomovich&background=0099B5&color=fff&bold=true&size=128" className="w-full h-full rounded-xl object-cover"/>
                       </div>
                       
                       <div className="mt-4">
                           <h3 className="text-xl font-black text-slate-900">Turdiev Sarvar Ilkhomovich</h3>
                           <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Sarvar Ilkhomovich</p>
                           <div className="mt-4 flex gap-2 justify-center">
                               <span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                   <Shield size={12}/> Faol
                               </span>
                               <span className="px-3 py-1 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                   <Briefcase size={12}/> Tergovchi
                               </span>
                           </div>
                       </div>

                       <div className="w-full mt-6 space-y-3">
                           <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                               <span className="text-xs font-bold text-slate-500">ID Raqam</span>
                               <span className="text-xs font-black text-slate-800 font-mono">T-007-992</span>
                           </div>
                           <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                               <span className="text-xs font-bold text-slate-500">Bo'lim</span>
                               <span className="text-xs font-black text-slate-800">Farg'ona viloyati IIB xuzuridagi TB UMIIB</span>
                           </div>
                           <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                               <span className="text-xs font-bold text-slate-500">Telefon</span>
                               <span className="text-xs font-black text-slate-800">+998 90 123-45-67</span>
                           </div>
                       </div>
                   </div>

                   <button
                       type="button"
                       onClick={onSettings}
                       className="w-full py-4 bg-white border border-slate-200 rounded-2xl font-bold text-xs text-slate-600 hover:border-uzblue hover:text-uzblue transition-all flex items-center justify-center gap-2 shadow-sm"
                       aria-label="Sozlamalar"
                   >
                       <Settings size={16}/> SOZLAMALARNI O'ZGARTIRISH
                   </button>
               </div>

               {/* Right: Stats & Activity */}
               <div className="lg:col-span-2 space-y-6">
                   
                   {/* Stats Grid */}
                   <div className="grid grid-cols-3 gap-4">
                       <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                           <div className="flex items-center gap-2 mb-2 text-uzblue">
                               <FileCheck size={20}/>
                               <span className="text-[10px] font-black uppercase tracking-widest">Yopilgan Ishlar</span>
                           </div>
                           <div className="text-3xl font-black text-slate-800">45</div>
                       </div>
                       <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                           <div className="flex items-center gap-2 mb-2 text-amber-500">
                               <Star size={20}/>
                               <span className="text-[10px] font-black uppercase tracking-widest">Reyting</span>
                           </div>
                           <div className="text-3xl font-black text-slate-800">4.9</div>
                       </div>
                       <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                           <div className="flex items-center gap-2 mb-2 text-purple-500">
                               <Award size={20}/>
                               <span className="text-[10px] font-black uppercase tracking-widest">Mukofotlar</span>
                           </div>
                           <div className="text-3xl font-black text-slate-800">3</div>
                       </div>
                   </div>

                   {/* Recent Activity */}
                   <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                       <h3 className="text-sm font-black text-slate-800 uppercase mb-6 flex items-center gap-2">
                           <Briefcase size={16} className="text-slate-400"/>
                           Oxirgi Faoliyat Tarixi
                       </h3>
                       
                       <div className="space-y-6 relative">
                           {/* Timeline line */}
                           <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-slate-100"></div>

                           {[
                               { title: "Tergov harakati yakunlandi", time: "Bugun, 14:30", desc: "Jinoyat ishi #300002/2025 bo'yicha bayonnoma tuzildi.", icon: FileCheck, color: "bg-emerald-500" },
                               { title: "Tizimga kirildi", time: "Bugun, 09:00", desc: "Farg'ona shahar IIB tarmog'idan.", icon: Key, color: "bg-blue-500" },
                               { title: "Yangi topshiriq olindi", time: "Kecha, 18:45", desc: "Boshqarma boshlig'idan maxsus topshiriq.", icon: Shield, color: "bg-amber-500" },
                           ].map((item, i) => (
                               <div key={i} className="flex gap-4 relative">
                                   <div className={`w-5 h-5 rounded-full ${item.color} border-4 border-white shadow-sm shrink-0 z-10`}></div>
                                   <div>
                                       <div className="flex items-center gap-2 mb-1">
                                           <span className="text-xs font-bold text-slate-800">{item.title}</span>
                                           <span className="text-[10px] text-slate-400 font-mono">{item.time}</span>
                                       </div>
                                       <p className="text-xs text-slate-500">{item.desc}</p>
                                   </div>
                               </div>
                           ))}
                       </div>
                   </div>

               </div>
           </div>
       </div>
    </div>
  );
}
export default UserProfile;
