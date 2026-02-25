import React, { useState, useEffect, useCallback } from "react";
import { storageService } from "../../services/storageService";
import { SavedDocument } from "../../types";
import { FileText, Video, Trash2, Search, Archive, ArrowLeft, X, FileStack } from "lucide-react";
import { useToast } from "../../contexts/ToastContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { ConfirmModal } from "../ui/ConfirmModal";

interface DocumentsProps {
  onBack: () => void;
  initialSearch?: string;
  onClearInitialSearch?: () => void;
}

const Documents: React.FC<DocumentsProps> = ({ onBack, initialSearch = "", onClearInitialSearch }) => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [docs, setDocs] = useState<SavedDocument[]>([]);
  const [search, setSearch] = useState(initialSearch);
  const [selectedDoc, setSelectedDoc] = useState<SavedDocument | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const refreshDocs = useCallback(() => setDocs(storageService.getDocuments()), []);

  useEffect(() => {
    refreshDocs();
  }, [refreshDocs]);

  useEffect(() => {
    if (initialSearch) {
      setSearch(initialSearch);
      onClearInitialSearch?.();
    }
  }, [initialSearch, onClearInitialSearch]);

  const deleteDoc = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTargetId(id);
  };

  const confirmDelete = useCallback(() => {
    if (!deleteTargetId) return;
    try {
      storageService.deleteDocument(deleteTargetId);
      refreshDocs();
      if (selectedDoc?.id === deleteTargetId) setSelectedDoc(null);
      toast(t('doc_deleted'), "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : t('msg_error'), "error");
    } finally {
      setDeleteTargetId(null);
    }
  }, [deleteTargetId, selectedDoc?.id, refreshDocs, toast, t]);

  const filteredDocs = docs.filter((d) => d.title.toLowerCase().includes(search.toLowerCase().trim()));

  return (
    <div className="w-full h-full flex flex-col bg-[#F8FAFC] overflow-hidden text-slate-900">
        <div className="h-20 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0 z-20 shadow-sm">
            <div className="flex items-center gap-4">
                <button type="button" onClick={onBack} className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 transition-all border border-slate-200" aria-label={t('back')}><ArrowLeft size={22}/></button>
                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3 tracking-tight"><Archive className="text-amber-500" size={28}/> {t('doc_archive').toUpperCase()}</h2>
            </div>
            <div className="bg-slate-100 p-2 rounded-xl flex items-center border border-slate-200">
                <Search className="text-slate-400 mr-2 shrink-0" size={18} aria-hidden/>
                <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('doc_search')} className="bg-transparent outline-none text-sm text-slate-800 w-48 min-w-0" aria-label={t('search')}/>
            </div>
        </div>

        <div className="flex flex-1 min-h-0 p-6 gap-6">
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                {filteredDocs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                        <FileStack size={56} className="mb-4 opacity-40" aria-hidden/>
                        <p className="text-sm font-bold">{docs.length === 0 ? t('doc_empty') : t('doc_no_results')}</p>
                        <p className="text-xs mt-1">{docs.length === 0 ? t('doc_empty_suggest') : t('doc_try_again')}</p>
                    </div>
                ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredDocs.map((doc) => (
                        <div key={doc.id} onClick={() => setSelectedDoc(doc)} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setSelectedDoc(doc)} className={`p-5 rounded-xl border cursor-pointer hover:shadow-lg transition-all ${selectedDoc?.id === doc.id ? "border-uzblue bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                            <div className="flex justify-between mb-2"><div className="p-2 bg-slate-100 rounded-lg">{doc.category === "VIDEO" ? <Video size={20}/> : <FileText size={20}/>}</div></div>
                            <h3 className="font-bold text-slate-800 line-clamp-1">{doc.title}</h3>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{doc.description ?? ""}</p>
                            <div className="flex justify-between mt-4 items-center">
                                <span className="text-[10px] text-slate-400">{new Date(doc.createdAt).toLocaleDateString("uz-UZ")}</span>
                                <button type="button" onClick={(e) => deleteDoc(doc.id, e)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50" aria-label={t('delete')}><Trash2 size={16}/></button>
                            </div>
                        </div>
                    ))}
                </div>
                )}
            </div>
            
            <ConfirmModal
              open={deleteTargetId !== null}
              title={t('doc_delete_title')}
              message={t('doc_delete_msg')}
              confirmLabel={t('doc_delete_confirm')}
              cancelLabel={t('cancel')}
              variant="danger"
              onConfirm={confirmDelete}
              onCancel={() => setDeleteTargetId(null)}
            />

            {selectedDoc && (
                <div className="w-[450px] bg-white border border-slate-200 rounded-2xl shadow-xl flex flex-col overflow-hidden animate-slide-in-right shrink-0">
                    <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                        <span className="font-bold uppercase text-slate-500 text-xs">{selectedDoc.category}</span>
                        <button type="button" onClick={() => setSelectedDoc(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100" aria-label={t('back')}><X size={20}/></button>
                    </div>
                    <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                        <h2 className="text-2xl font-black mb-4">{selectedDoc.title}</h2>
                        {selectedDoc.mediaUrl && <img src={selectedDoc.mediaUrl} alt="" className="w-full rounded-xl border border-slate-200 mb-4"/>}
                        <div className="prose prose-sm text-slate-700 whitespace-pre-wrap">{selectedDoc.content || selectedDoc.description || "—"}</div>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};
export default Documents;
