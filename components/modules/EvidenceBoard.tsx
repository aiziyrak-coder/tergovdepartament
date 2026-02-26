
import React, { useState, useRef, useEffect } from "react";
import { Network, ArrowLeft, User, Fingerprint } from "lucide-react";
import { EvidenceNode, InvestigationHypothesis } from "../../types";

type SetBoardsType = React.Dispatch<React.SetStateAction<InvestigationHypothesis[]>>;

interface EvidenceBoardProps {
  onBack: () => void;
  boards: InvestigationHypothesis[];
  setBoards: SetBoardsType;
}

const EvidenceBoard: React.FC<EvidenceBoardProps> = ({ onBack, boards, setBoards }) => {
  const [activeBoardId, setActiveBoardId] = useState<string>(boards.length > 0 ? boards[0].id : '');
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
      if (boards.length === 0) {
          setBoards([{ id: 'case-001', name: 'Янги Иш', nodes: [], edges: [], isActive: true }]);
          setActiveBoardId('case-001');
      }
      setPosition({ x: window.innerWidth/3, y: window.innerHeight/3 });
  }, []);

  const activeBoard = boards.find((b) => b.id === activeBoardId) ?? { id: "temp", name: "...", nodes: [], edges: [], isActive: false };
  const updateBoard = (id: string, data: Partial<Pick<InvestigationHypothesis, "nodes" | "edges" | "name" | "isActive">>) => {
    setBoards((prev) => prev.map((b) => (b.id === id ? { ...b, ...data } : b)));
  };

  const handleMouseDown = (e: React.MouseEvent) => { if ((e.target as HTMLElement).classList.contains('board-bg')) { setIsPanning(true); setStartPan({ x: e.clientX - position.x, y: e.clientY - position.y }); } };
  const handleMouseMove = (e: React.MouseEvent) => {
      if (isPanning) setPosition({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
      else if (draggingNode) updateBoard(activeBoardId, { nodes: activeBoard.nodes.map(n => n.id === draggingNode ? { ...n, x: n.x + e.movementX/scale, y: n.y + e.movementY/scale } : n) });
  };

  return (
    <div className="flex h-full flex-col bg-[#F8FAFC] overflow-hidden font-sans relative text-slate-900">
      <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-20 shrink-0 shadow-sm">
          <div className="flex items-center gap-4">
              <button type="button" onClick={onBack} className="p-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100" aria-label="Ортага"><ArrowLeft size={20}/></button>
              <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800"><Network className="text-uzblue" size={24}/> {activeBoard.name}</h2>
          </div>
          <div className="flex gap-3">
              <button type="button" onClick={() => updateBoard(activeBoardId, { nodes: [...activeBoard.nodes, { id: `n-${Date.now()}`, type: "PERSON", label: "Янги Шаһс", content: "", x: (-position.x + window.innerWidth / 2) / scale, y: (-position.y + window.innerHeight / 2) / scale } as EvidenceNode] })} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold shadow-sm hover:shadow-md">+ Шаһс</button>
              <button type="button" onClick={() => updateBoard(activeBoardId, { nodes: [...activeBoard.nodes, { id: `n-${Date.now()}`, type: "EVIDENCE", label: "Далил", content: "", x: (-position.x + window.innerWidth / 2) / scale + 50, y: (-position.y + window.innerHeight / 2) / scale + 50 } as EvidenceNode] })} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold shadow-sm hover:shadow-md">+ Далил</button>
          </div>
      </div>

      <div className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing board-bg bg-[#F1F5F9]" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={()=>{setIsPanning(false); setDraggingNode(null);}}>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none opacity-50"></div>
          <div className="absolute top-0 left-0 w-full h-full transform-gpu" style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`, transformOrigin: '0 0' }}>
               <svg className="absolute top-[-50000px] left-[-50000px] w-[100000px] h-[100000px] pointer-events-none overflow-visible">
                   {activeBoard.edges.map(edge => {
                       const s = activeBoard.nodes.find(n => n.id === edge.source);
                       const t = activeBoard.nodes.find(n => n.id === edge.target);
                       if (!s || !t) return null;
                       return <line key={edge.id} x1={s.x+100} y1={s.y+50} x2={t.x+100} y2={t.y+50} stroke="#94a3b8" strokeWidth="2"/>;
                   })}
               </svg>
               {activeBoard.nodes.map(node => (
                   <div key={node.id} onMouseDown={(e)=>{e.stopPropagation(); setDraggingNode(node.id)}} style={{transform:`translate(${node.x}px, ${node.y}px)`}} className={`absolute w-[200px] bg-white border ${node.type==='PERSON'?'border-blue-200':'border-red-200'} rounded-xl shadow-lg p-0 z-10 hover:shadow-xl`}>
                       <div className={`p-2 rounded-t-xl border-b flex items-center gap-2 ${node.type==='PERSON'?'bg-blue-50 border-blue-100':'bg-red-50 border-red-100'}`}>
                           {node.type==='PERSON'?<User size={14} className="text-blue-500"/>:<Fingerprint size={14} className="text-red-500"/>}
                           <input value={node.label} onChange={e=>updateBoard(activeBoardId, {nodes:activeBoard.nodes.map(n=>n.id===node.id?{...n, label:e.target.value}:n)})} className="bg-transparent text-xs font-bold outline-none w-full text-slate-800"/>
                       </div>
                       <div className="p-2"><textarea value={node.content} onChange={e=>updateBoard(activeBoardId, {nodes:activeBoard.nodes.map(n=>n.id===node.id?{...n, content:e.target.value}:n)})} className="w-full bg-slate-50 border border-slate-100 rounded p-1 text-[10px] resize-none outline-none h-[60px]" placeholder="Izoh..."/></div>
                   </div>
               ))}
          </div>
      </div>
    </div>
  );
};
export default EvidenceBoard;
