
import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, BrainCircuit, CheckCircle2, 
  Clock, Loader2, X, Play, Package, Undo2, Info
} from 'lucide-react';
import { 
  WorkflowStage, SizeTarget 
} from '../types';
import { WORKFLOW_ORDER } from '../constants';
import { analyzeProductionData } from '../services/gemini';
import { DataContext } from '../App';
import { db } from '../services/supabase';

const STAGE_RESULT_MAP: Record<string, string> = {
  [WorkflowStage.POLA]: 'res_pola',
  [WorkflowStage.POTONG]: 'res_potong',
  [WorkflowStage.JAHIT]: 'res_jahit',
  [WorkflowStage.QC]: 'res_qc',
  [WorkflowStage.STEAM]: 'res_steam',
  [WorkflowStage.PACKING]: 'res_packing',
};

export const BatchDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const context = useContext(DataContext);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [sizeResults, setSizeResults] = useState<Record<string, string>>({});

  const batchData = context?.data?.Produksi?.find((b: any) => String(b.id) === String(id));
  const products = context?.data?.Produk || [];
  const materials = context?.data?.Bahan || [];
  const accessories = context?.data?.Aksesoris || [];
  const product = products.find((p: any) => String(p.id) === String(batchData?.product_id));
  
  if (!context) return null;
  const { refreshData, showModal } = context;

  const safeParse = (str: any) => {
    if (!str) return [];
    try { return typeof str === 'string' ? JSON.parse(str) : str; } catch (e) { return []; }
  };

  const sizeTargets: SizeTarget[] = safeParse(batchData?.targets);
  const batch: any = batchData || { id: id, code: '...', status: 'PENDING', current_stage: 'POLA', progress: 0 };

  useEffect(() => {
    if (showUpdateModal && sizeTargets.length > 0) {
      const initialResults: Record<string, string> = {};
      sizeTargets.forEach(s => { initialResults[s.size] = String(s.resultQty || s.targetQty || 0); });
      setSizeResults(initialResults);
    }
  }, [showUpdateModal, sizeTargets]);

  const handleUpdateStage = async () => {
    const currentStage = (batch.current_stage) as WorkflowStage;
    const currentIndex = WORKFLOW_ORDER.indexOf(currentStage);
    const nextIndex = currentIndex + 1;
    if (nextIndex >= WORKFLOW_ORDER.length) return;

    const nextStage = WORKFLOW_ORDER[nextIndex];
    const isFinishing = nextStage === WorkflowStage.DONE;
    const totalActual = Object.values(sizeResults).reduce((sum: number, val) => sum + (Number(val) || 0), 0);
    const updatedTargets = sizeTargets.map(s => ({ ...s, resultQty: Number(sizeResults[s.size]) || 0 }));
    const resultField = STAGE_RESULT_MAP[currentStage];

    const updatedData: any = { current_stage: nextStage, progress: Math.round(((nextIndex) / (WORKFLOW_ORDER.length - 1)) * 100), status: isFinishing ? 'SELESAI' : 'PROSES', targets: JSON.stringify(updatedTargets) };
    if (resultField) updatedData[resultField] = totalActual;
    if (isFinishing) updatedData.actual_output = totalActual;

    setIsUpdating(true);
    const result = await db.production.update(batch.id, updatedData);
    if (result && !result.error) {
      if (isFinishing) {
        for (const target of updatedTargets) {
          if (target.resultQty > 0) await db.inventory.adjustStock(batch.product_id, 'loc-pusat', batch.variant_color || 'Umum', target.size, target.resultQty);
        }
      }
      await refreshData();
      setShowUpdateModal(false);
      showModal({ title: 'Berhasil', message: `Produksi berlanjut ke tahap ${nextStage}.`, type: 'success' });
    } else {
      showModal({ title: 'Gagal', message: 'Gagal memperbarui tahapan produksi.', type: 'error' });
    }
    setIsUpdating(false);
  };

  const executeRollbackAction = async () => {
    setIsUpdating(true);
    const currentStage = (batch.current_stage) as WorkflowStage;
    const currentIndex = WORKFLOW_ORDER.indexOf(currentStage);
    const prevIndex = currentIndex - 1;
    const prevStage = WORKFLOW_ORDER[prevIndex];
    
    if (batch.status === 'SELESAI' || currentStage === WorkflowStage.DONE) {
      const targets = safeParse(batch.targets);
      for (const t of targets) {
        if (t.resultQty > 0) await db.inventory.adjustStock(batch.product_id, 'loc-pusat', batch.variant_color || 'Umum', t.size, -t.resultQty);
      }
    }

    const updatedData: any = { current_stage: prevStage, status: 'PROSES', progress: Math.round((prevIndex / (WORKFLOW_ORDER.length - 1)) * 100) };
    const fieldToClear = STAGE_RESULT_MAP[prevStage];
    if (fieldToClear) updatedData[fieldToClear] = null;

    const result = await db.production.update(batch.id, updatedData);
    if (result && !result.error) {
      await refreshData();
      showModal({ title: 'Rollback Berhasil', message: `Tahapan dikembalikan ke ${prevStage}.`, type: 'success' });
    } else {
      showModal({ title: 'Gagal', message: 'Gagal melakukan rollback tahapan.', type: 'error' });
    }
    setIsUpdating(false);
  };

  const handleRollbackStage = () => {
    const currentIndex = WORKFLOW_ORDER.indexOf(batch.current_stage as WorkflowStage);
    if (currentIndex <= 0) return showModal({ title: 'Awal Tahap', message: 'Produksi sudah berada di tahap paling awal.', type: 'alert' });

    showModal({
      title: 'Konfirmasi Rollback',
      message: `Apakah Anda yakin ingin memundurkan tahapan produksi? Stok gudang akan disesuaikan jika batch ini sudah selesai.`,
      type: 'confirm',
      confirmLabel: 'Ya, Mundurkan',
      onConfirm: () => executeRollbackAction()
    });
  };

  const runAIAnalysis = async () => {
    if (!batchData) return;
    setLoadingAI(true);
    const analysis = await analyzeProductionData(batchData, materials, accessories);
    setAiAnalysis(analysis);
    setLoadingAI(false);
  };

  const materialsUsed = safeParse(batchData?.materials_used);
  const accessoriesUsed = safeParse(batchData?.accessories_used);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/production')} className="p-2 hover:bg-slate-100 rounded-full"><ArrowLeft size={20} /></button>
          <div>
            <h1 className="text-2xl font-black">{batch.code}</h1>
            <p className="text-indigo-600 font-black text-[10px] uppercase">Model: {product?.name || '...'}</p>
          </div>
        </div>
        <div className={`px-4 py-1.5 rounded-full text-xs font-black uppercase ${batch.status === 'SELESAI' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{batch.status}</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 flex items-center gap-2"><Clock size={16} /> Progress Produksi</h3>
              {batch.status !== 'PENDING' && <button onClick={handleRollbackStage} disabled={isUpdating} className="flex items-center gap-2 text-[10px] font-black uppercase text-amber-600 hover:text-amber-700 transition-colors"><Undo2 size={14} /> Mundur Tahap</button>}
            </div>
            
            <div className="space-y-6 relative">
              <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-slate-100"></div>
              {WORKFLOW_ORDER.map((stage, idx) => {
                const currentStage = batch.current_stage;
                const isCurrent = currentStage === stage;
                const isPast = WORKFLOW_ORDER.indexOf(currentStage as WorkflowStage) > idx;
                const field = STAGE_RESULT_MAP[stage];
                const resultCount = field ? batch[field] : null;

                return (
                  <div key={stage} className={`flex gap-6 items-center relative z-10 ${!isPast && !isCurrent ? 'opacity-40' : ''}`}>
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-black text-[10px] ${isPast ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-indigo-600 text-indigo-600 shadow-sm'}`}>{isPast ? <CheckCircle2 size={16} /> : idx + 1}</div>
                    <div className={`flex-1 flex justify-between items-center p-4 rounded-2xl border transition-all ${isCurrent ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50/50 border-slate-100/50'}`}>
                      <div><span className="font-black uppercase text-[10px] tracking-widest block">{stage}</span>{resultCount !== null && <span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Hasil: {resultCount} PCS</span>}</div>
                      {isCurrent && stage !== WorkflowStage.DONE && <button onClick={() => setShowUpdateModal(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg flex items-center gap-2">{isUpdating ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />} Input Hasil</button>}
                      {isPast && <span className="text-[10px] font-black text-emerald-600 uppercase flex items-center gap-1"><CheckCircle2 size={12} /> Selesai</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100">
             <div className="flex justify-between items-center mb-8">
                <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 flex items-center gap-2"><BrainCircuit size={16} className="text-indigo-600" /> Analisis AI Gemini</h3>
                <button onClick={runAIAnalysis} disabled={loadingAI} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-indigo-100 transition-all">{loadingAI ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Jalankan Analisis</button>
             </div>
             {aiAnalysis ? <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 prose prose-sm max-w-none"><p className="text-xs text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">{aiAnalysis}</p></div> : <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-2xl"><p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Belum ada analisis untuk batch ini</p></div>}
          </div>
        </div>

        <div className="space-y-8">
           <div className="bg-indigo-900 p-8 rounded-[2.5rem] text-white shadow-xl">
              <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-2">Total Estimasi Biaya (HPP)</p>
              <h3 className="text-3xl font-black">Rp {Number(batch.total_cost || 0).toLocaleString()}</h3>
              <div className="mt-6 pt-6 border-t border-white/10 space-y-4">
                 <div className="flex justify-between text-[10px] font-black uppercase tracking-widest"><span className="text-indigo-300">Target</span><span>{batch.target} PCS</span></div>
                 <div className="flex justify-between text-[10px] font-black uppercase tracking-widest"><span className="text-indigo-300">Selesai</span><span className="text-emerald-400">{batch.actual_output || 0} PCS</span></div>
              </div>
           </div>
           <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 space-y-2">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Package size={14} /> Material</h4>
              {materialsUsed.map((m: any, i: number) => (
                <div key={i} className="p-3 bg-slate-50 rounded-xl flex justify-between text-[10px] font-black uppercase">
                   <span className="truncate max-w-[120px]">{materials.find((x:any)=>x.id===m.materialId)?.name || 'Bahan'}</span>
                   <span>{m.qty} UNIT</span>
                </div>
              ))}
           </div>
        </div>
      </div>

      {showUpdateModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <div><h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Input Hasil: {batch.current_stage}</h2><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Isi jumlah output riil per ukuran</p></div>
              <button onClick={() => setShowUpdateModal(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={24} /></button>
            </div>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1">
              {sizeTargets.map(s => (
                <div key={s.size} className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-[10px] font-black uppercase">{s.size}</div>
                    <div><span className="text-[9px] font-bold text-slate-400 block uppercase">Target Awal</span><span className="text-xs font-black text-slate-600">{s.targetQty} PCS</span></div>
                  </div>
                  <input type="number" value={sizeResults[s.size] || ''} onChange={(e) => setSizeResults({...sizeResults, [s.size]: e.target.value})} className="w-24 px-3 py-2 bg-white border border-slate-200 rounded-xl text-right font-black outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-8">
               <button onClick={() => setShowUpdateModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-[10px]">Batal</button>
               <button onClick={handleUpdateStage} disabled={isUpdating} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl flex items-center justify-center gap-3">{isUpdating ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />} Simpan & Lanjut</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
