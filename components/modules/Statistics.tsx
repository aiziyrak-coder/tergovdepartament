import React, { useEffect, useState } from 'react';
import { ArrowLeft, BarChart3, TrendingUp, Users, FileText, CheckCircle2, Clock, AlertTriangle, PieChart } from 'lucide-react';
import { storageService } from '../../services/storageService';
import { useToast } from '../../contexts/ToastContext';
import { SavedDocument } from '../../types';

interface StatisticsProps { onBack: () => void; }

const Statistics: React.FC<StatisticsProps> = ({ onBack }) => {
  const { toast } = useToast();
  const [stats, setStats] = useState({
      total: 0,
      protocols: 0,
      stenograms: 0,
      photorobots: 0
  });

  useEffect(() => {
      try {
          const docs: SavedDocument[] = storageService.getDocuments();
          setStats({
              total: docs.length,
              protocols: docs.filter(d => d.category === 'PROTOCOL').length,
              stenograms: docs.filter(d => d.category === 'STENOGRAM').length,
              photorobots: docs.filter(d => d.category === 'PHOTOROBOT').length,
          });
      } catch {
          toast("Statistika yuklanmadi. Keyinroq urinib ko'ring.", "error");
      }
  }, [toast]);

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
                        <BarChart3 className="text-purple-600" size={24}/>
                        Tergov <span className="text-purple-600">Statistikasi</span>
                    </h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Tahlil va Ko'rsatkichlar</p>
                </div>
            </div>
       </div>
       
       <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
           <div className="max-w-6xl mx-auto space-y-8">
               
               {/* KPI Cards */}
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                   <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                       <div className="flex justify-between items-start mb-4">
                           <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><FileText size={20}/></div>
                           {stats.total > 0 && <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">Jami</span>}
                       </div>
                       <h3 className="text-3xl font-black text-slate-800 mb-1">{stats.total}</h3>
                       <p className="text-xs font-bold text-slate-400 uppercase">Jami arxivlangan ishlar</p>
                   </div>
                   
                   <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                       <div className="flex justify-between items-start mb-4">
                           <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle2 size={20}/></div>
                           {stats.protocols > 0 && <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">{stats.total ? Math.round((stats.protocols / stats.total) * 100) : 0}%</span>}
                       </div>
                       <h3 className="text-3xl font-black text-slate-800 mb-1">{stats.protocols}</h3>
                       <p className="text-xs font-bold text-slate-400 uppercase">Bayonnomalar</p>
                   </div>

                   <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                       <div className="flex justify-between items-start mb-4">
                           <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Clock size={20}/></div>
                           {stats.stenograms > 0 && stats.total > 0 && <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded">{Math.round((stats.stenograms / stats.total) * 100)}%</span>}
                       </div>
                       <h3 className="text-3xl font-black text-slate-800 mb-1">{stats.stenograms}</h3>
                       <p className="text-xs font-bold text-slate-400 uppercase">Stenogrammalar</p>
                   </div>

                   <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                       <div className="flex justify-between items-start mb-4">
                           <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><Users size={20}/></div>
                           <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded">Online</span>
                       </div>
                       <h3 className="text-3xl font-black text-slate-800 mb-1">1</h3>
                       <p className="text-xs font-bold text-slate-400 uppercase">Faol Tergovchilar</p>
                   </div>
               </div>

               {/* Charts Area */}
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                   
                   {/* Case Categories */}
                   <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                       <h3 className="text-sm font-black text-slate-800 uppercase mb-6 flex items-center gap-2">
                           <TrendingUp size={16} className="text-slate-400"/>
                           Modullar Kesimida Tahlil
                       </h3>
                       <div className="space-y-4">
                           {[
                               { label: "Bayonnomalar", val: stats.total > 0 ? Math.round((stats.protocols/stats.total)*100) : 0, color: "bg-blue-500" },
                               { label: "Fotorobotlar", val: stats.total > 0 ? Math.round((stats.photorobots/stats.total)*100) : 0, color: "bg-red-500" },
                               { label: "Audio Stenogramma", val: stats.total > 0 ? Math.round((stats.stenograms/stats.total)*100) : 0, color: "bg-amber-500" },
                           ].map((item, i) => (
                               <div key={i}>
                                   <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                                       <span>{item.label}</span>
                                       <span>{item.val}%</span>
                                   </div>
                                   <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                       <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.val}%` }}></div>
                                   </div>
                               </div>
                           ))}
                       </div>
                   </div>

                   {/* Workload */}
                   <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                       <h3 className="text-sm font-black text-slate-800 uppercase mb-6 flex items-center gap-2">
                           <AlertTriangle size={16} className="text-slate-400"/>
                           Muddati O'tib Ketayotgan Ishlar
                       </h3>
                       <div className="space-y-3">
                           {[
                               { id: "300002/2025", name: "Fuqaro A.K. ishi", days: 2, status: "Critical" },
                               { id: "300015/2025", name: "Magazin o'g'riligi", days: 5, status: "Warning" },
                               { id: "300022/2025", name: "YTH Farg'ona ko'chasi", days: 7, status: "Warning" },
                           ].map((task, i) => (
                               <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                   <div>
                                       <div className="text-xs font-black text-slate-800">{task.id}</div>
                                       <div className="text-[10px] text-slate-500 font-bold">{task.name}</div>
                                   </div>
                                   <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${task.status === 'Critical' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                                       {task.days} kun qoldi
                                   </div>
                               </div>
                           ))}
                           {/* Empty State filler */}
                           <div className="p-8 text-center text-slate-400 text-xs font-medium italic opacity-50">
                               Tergov muddatlari nazorat ostida
                           </div>
                       </div>
                   </div>
               </div>
           </div>
       </div>
    </div>
  );
}
export default Statistics;
