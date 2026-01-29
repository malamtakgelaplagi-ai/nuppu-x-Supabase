
import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, ChevronRight, Clock, CheckCircle2, Loader2, X, Target, Info, 
  Package, ShoppingCart, DollarSign, Trash2, Box, Tag, ListPlus, Scissors, Shirt, AlertCircle,
  Play, Layers, Scale, Sparkles, Palette, PlusCircle, MinusCircle, Calculator,
  ShoppingBasket
} from 'lucide-react';
import { ProductionType, ProductionModel, ProductionStatus, WorkflowStage, MaterialUsage, AccessoryUsage, SizeTarget } from '../types';
import { DataContext } from '../App';
import { db } from '../services/supabase';

export const ProductionBatches: React.FC = () => {
  const navigate = useNavigate();
  const context = useContext(DataContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    product_id: '',
    code: `PRD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    variant_color: '',
    type: ProductionType.MASSAL,
    model: ProductionModel.READY_STOCK,
    target: '0',
    start_date: new Date().toISOString().split('T')[0],
    sewing_cost: '',
  });

  const [sizeTargets, setSizeTargets] = useState<SizeTarget[]>([]);
  const [tempSize, setTempSize] = useState({ size: '', qty: '' });

  const [selectedMaterials, setSelectedMaterials] = useState<MaterialUsage[]>([]);
  const [selectedAccessories, setSelectedAccessories] = useState<AccessoryUsage[]>([]);
  const [otherCostsList, setOtherCostsList] = useState<{label: string, amount: number}[]>([]);

  const [tempMaterial, setTempMaterial] = useState({ id: '', qty: '' });
  const [tempAccessory, setTempAccessory] = useState({ id: '', qty: '' });
  const [tempOtherCost, setTempOtherCost] = useState({ label: '', amount: '' });

  if (!context) return null;
  const { data, loading, refreshData } = context;

  const batches = data?.Produksi || [];
  const materialsList = data?.Bahan || [];
  const accessoriesList = data?.Aksesoris || [];
  const productsList = data?.Produk || [];

  useEffect(() => {
    const total = sizeTargets.reduce((acc, curr) => acc + curr.targetQty, 0);
    setFormData(prev => ({ ...prev, target: total.toString() }));
  }, [sizeTargets]);

  const handleAddSize = () => {
    if (!tempSize.size || !tempSize.qty) return;
    const sizeToUse = tempSize.size.toUpperCase();
    if (sizeTargets.find(s => s.size === sizeToUse)) return alert("Ukuran sudah ada");
    setSizeTargets([...sizeTargets, { size: sizeToUse, targetQty: Number(tempSize.qty), resultQty: 0 }]);
    setTempSize({ size: '', qty: '' });
  };

  const removeSize = (sizeName: string) => {
    setSizeTargets(sizeTargets.filter(s => s.size !== sizeName));
  };

  const handleAddMaterial = () => {
    if (!tempMaterial.id || !tempMaterial.qty) return;
    const mat = materialsList.find((m: any) => m.id === tempMaterial.id);
    if (!mat) return;
    if (selectedMaterials.find(m => m.materialId === tempMaterial.id)) return alert("Bahan sudah dipilih");
    
    setSelectedMaterials([...selectedMaterials, { 
      materialId: mat.id, 
      qty: Number(tempMaterial.qty), 
      snapshotPrice: Number(mat.price_per_unit || 0) 
    }]);
    setTempMaterial({ id: '', qty: '' });
  };

  const handleAddAccessory = () => {
    if (!tempAccessory.id || !tempAccessory.qty) return;
    const acc = accessoriesList.find((a: any) => a.id === tempAccessory.id);
    if (!acc) return;
    if (selectedAccessories.find(a => a.accessoryId === tempAccessory.id)) return alert("Aksesoris sudah dipilih");

    setSelectedAccessories([...selectedAccessories, { 
      accessoryId: acc.id, 
      qty: Number(tempAccessory.qty), 
      snapshotPrice: Number(acc.price_per_unit || 0) 
    }]);
    setTempAccessory({ id: '', qty: '' });
  };

  const handleAddOtherCost = () => {
    if (!tempOtherCost.label || !tempOtherCost.amount) return;
    setOtherCostsList([...otherCostsList, { label: tempOtherCost.label, amount: Number(tempOtherCost.amount) }]);
    setTempOtherCost({ label: '', amount: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.product_id) return alert("Pilih produk!");
    if (sizeTargets.length === 0) return alert("Tambahkan minimal satu ukuran!");
    
    setIsSubmitting(true);
    
    const matCost = selectedMaterials.reduce((sum, m) => sum + (m.qty * m.snapshotPrice), 0);
    const accCost = selectedAccessories.reduce((sum, a) => sum + (a.qty * a.snapshotPrice), 0);
    const otherCost = otherCostsList.reduce((sum, c) => sum + c.amount, 0);
    const sewingTotal = Number(formData.sewing_cost) * Number(formData.target);
    const totalCost = matCost + accCost + otherCost + sewingTotal;

    // 1. Buat Batch Produksi
    const result = await db.production.upsert({
      id: crypto.randomUUID(),
      ...formData,
      status: ProductionStatus.PENDING,
      current_stage: WorkflowStage.POLA,
      progress: 0,
      target: Number(formData.target),
      targets: JSON.stringify(sizeTargets),
      sewing_cost: Number(formData.sewing_cost || 0),
      other_costs: JSON.stringify(otherCostsList),
      materials_used: JSON.stringify(selectedMaterials),
      accessories_used: JSON.stringify(selectedAccessories),
      total_cost: totalCost
    });

    if (result && !result.error) {
      // 2. POTONG STOK FISIK (Bahan & Aksesoris)
      // Gunakan Promise.all untuk eksekusi paralel yang lebih cepat
      try {
        const materialUpdates = selectedMaterials.map(m => db.materials.updateStock(m.materialId, -m.qty));
        const accessoryUpdates = selectedAccessories.map(a => db.accessories.updateStock(a.accessoryId, -a.qty));
        
        await Promise.all([...materialUpdates, ...accessoryUpdates]);
        
        await refreshData();
        setIsModalOpen(false);
        resetForm();
      } catch (err) {
        console.error("Gagal memotong stok:", err);
        alert("Batch berhasil dibuat, namun terjadi kesalahan saat memperbarui stok inventaris.");
      }
    } else {
      alert(`Gagal: ${result?.error?.message}`);
    }
    setIsSubmitting(false);
  };

  const resetForm = () => {
    setFormData({ 
      product_id: '', 
      code: `PRD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`, 
      variant_color: '',
      type: ProductionType.MASSAL, 
      model: ProductionModel.READY_STOCK, 
      target: '0', 
      start_date: new Date().toISOString().split('T')[0], 
      sewing_cost: '' 
    });
    setSizeTargets([]);
    setSelectedMaterials([]); 
    setSelectedAccessories([]); 
    setOtherCostsList([]);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen relative pb-20">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Produksi Batch</h1>
          <p className="text-slate-500 font-medium">Monitoring dan perencanaan produksi konveksi.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-3">
          <PlusCircle size={20} /> Mulai Batch Baru
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {batches.map((batch: any) => {
           const product = productsList.find((p: any) => p.id === batch.product_id);
           return (
            <div key={batch.id} onClick={() => navigate(`/production/${batch.id}`)} className="group bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 hover:shadow-xl transition-all cursor-pointer relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600"></div>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-800">{batch.code}</h3>
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mt-1">{product?.name || 'Produk Umum'}</p>
                </div>
                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${batch.status === 'SELESAI' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                  {batch.status}
                </div>
              </div>
              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <span>Tahap: {batch.current_stage}</span>
                  <span>{batch.progress}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner"><div className="h-full bg-indigo-600 transition-all duration-700" style={{ width: `${batch.progress}%` }} /></div>
              </div>
              <div className="flex justify-between items-end pt-4 border-t border-slate-50">
                 <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Target Qty</p>
                    <p className="text-lg font-black text-slate-800">{batch.target} <span className="text-xs text-slate-400">PCS</span></p>
                 </div>
                 <ChevronRight className="text-slate-300 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
           );
        })}
        {batches.length === 0 && !loading && (
          <div className="col-span-full py-20 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
            <Layers size={48} className="mb-4 opacity-20" />
            <p className="font-bold uppercase tracking-widest text-xs">Belum ada batch produksi aktif</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => !isSubmitting && setIsModalOpen(false)}></div>
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl max-h-[92vh] relative z-10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg"><Layers size={24} /></div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">Inisiasi Produksi Baru</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Lengkapi rincian teknis untuk perhitungan HPP otomatis</p>
                </div>
              </div>
              <button onClick={() => !isSubmitting && setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-10 overflow-y-auto space-y-10 flex-1 scroll-smooth">
              
              {/* SECTION 1: INFORMASI DASAR */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-black">01</span>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Informasi Utama</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Model Produk</label>
                    <select required value={formData.product_id} onChange={(e) => setFormData({...formData, product_id: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="">-- Pilih Model --</option>
                      {productsList.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Varian Warna</label>
                    <input required value={formData.variant_color} onChange={(e) => setFormData({...formData, variant_color: e.target.value})} placeholder="Contoh: Hitam Carbon" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipe Produksi</label>
                    <div className="grid grid-cols-2 gap-2">
                       <button type="button" onClick={() => setFormData({...formData, type: ProductionType.MASSAL})} className={`py-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${formData.type === ProductionType.MASSAL ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>Massal</button>
                       <button type="button" onClick={() => setFormData({...formData, type: ProductionType.SAMPLE})} className={`py-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${formData.type === ProductionType.SAMPLE ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>Sample</button>
                    </div>
                  </div>
                </div>
              </section>

              {/* SECTION 2: RINCIAN UKURAN */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xs font-black">02</span>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Rincian Ukuran (Size Breakdown)</h3>
                </div>
                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-6">
                   <div className="flex gap-4 items-end">
                      <div className="flex-1 space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Label Ukuran</label>
                        <input value={tempSize.size} onChange={(e) => setTempSize({...tempSize, size: e.target.value})} placeholder="S / M / L / XL" className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Qty (Pcs)</label>
                        <input type="number" value={tempSize.qty} onChange={(e) => setTempSize({...tempSize, qty: e.target.value})} placeholder="0" className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none" />
                      </div>
                      <button type="button" onClick={handleAddSize} className="px-6 py-3.5 bg-rose-600 text-white font-black text-[10px] uppercase rounded-xl flex items-center gap-2 shadow-lg shadow-rose-100"><Plus size={16} /> Tambah</button>
                   </div>
                   
                   <div className="flex flex-wrap gap-3 pt-2">
                      {sizeTargets.map((s, idx) => (
                        <div key={idx} className="flex items-center gap-3 px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm animate-in zoom-in-95">
                           <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase">{s.size}</span>
                           <span className="text-xs font-black text-slate-700">{s.targetQty} Pcs</span>
                           <button type="button" onClick={() => removeSize(s.size)} className="text-rose-500 hover:text-rose-700 ml-1"><Trash2 size={14} /></button>
                        </div>
                      ))}
                      {sizeTargets.length === 0 && <p className="text-[10px] font-bold text-slate-300 uppercase italic">Belum ada rincian ukuran...</p>}
                   </div>
                </div>
              </section>

              {/* SECTION 3: ALOKASI BAHAN & AKSESORIS */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-black">03</span>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Alokasi Bahan & Aksesoris</h3>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                   {/* Alokasi Bahan Baku */}
                   <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Package size={14} /> Alokasi Bahan Baku</h4>
                      <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-4">
                         <div className="flex gap-3">
                            <select value={tempMaterial.id} onChange={(e) => setTempMaterial({...tempMaterial, id: e.target.value})} className="flex-[2] px-4 py-3.5 bg-white border border-slate-200 rounded-xl font-bold text-xs outline-none">
                               <option value="">Pilih Bahan</option>
                               {materialsList.map((m: any) => <option key={m.id} value={m.id}>{m.name} ({m.color}) - {m.stock} {m.unit}</option>)}
                            </select>
                            <input type="number" placeholder="Qty" value={tempMaterial.qty} onChange={(e) => setTempMaterial({...tempMaterial, qty: e.target.value})} className="flex-1 px-4 py-3.5 bg-white border border-slate-200 rounded-xl font-bold text-xs outline-none" />
                            <button type="button" onClick={handleAddMaterial} className="p-3.5 bg-emerald-600 text-white rounded-xl shadow-lg"><Plus size={18} /></button>
                         </div>
                         <div className="space-y-2">
                            {selectedMaterials.map((m, i) => {
                               const matInfo = materialsList.find((x:any) => x.id === m.materialId);
                               return (
                                 <div key={i} className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-100 text-xs font-bold">
                                    <span className="text-slate-700">{matInfo?.name}</span>
                                    <div className="flex items-center gap-4">
                                       <span className="text-emerald-600">{m.qty} {matInfo?.unit}</span>
                                       <button type="button" onClick={() => setSelectedMaterials(selectedMaterials.filter((_, idx) => idx !== i))} className="text-rose-400"><X size={14} /></button>
                                    </div>
                                 </div>
                               );
                            })}
                         </div>
                      </div>
                   </div>

                   {/* Alokasi Aksesoris */}
                   <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><ShoppingBasket size={14} /> Alokasi Aksesoris</h4>
                      <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-4">
                         <div className="flex gap-3">
                            <select value={tempAccessory.id} onChange={(e) => setTempAccessory({...tempAccessory, id: e.target.value})} className="flex-[2] px-4 py-3.5 bg-white border border-slate-200 rounded-xl font-bold text-xs outline-none">
                               <option value="">Pilih Aksesoris</option>
                               {accessoriesList.map((a: any) => <option key={a.id} value={a.id}>{a.name} ({a.color}) - {a.stock} {a.unit}</option>)}
                            </select>
                            <input type="number" placeholder="Qty" value={tempAccessory.qty} onChange={(e) => setTempAccessory({...tempAccessory, qty: e.target.value})} className="flex-1 px-4 py-3.5 bg-white border border-slate-200 rounded-xl font-bold text-xs outline-none" />
                            <button type="button" onClick={handleAddAccessory} className="p-3.5 bg-blue-600 text-white rounded-xl shadow-lg"><Plus size={18} /></button>
                         </div>
                         <div className="space-y-2">
                            {selectedAccessories.map((a, i) => {
                               const accInfo = accessoriesList.find((x:any) => x.id === a.accessoryId);
                               return (
                                 <div key={i} className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-100 text-xs font-bold">
                                    <span className="text-slate-700">{accInfo?.name}</span>
                                    <div className="flex items-center gap-4">
                                       <span className="text-blue-600">{a.qty} {accInfo?.unit}</span>
                                       <button type="button" onClick={() => setSelectedAccessories(selectedAccessories.filter((_, idx) => idx !== i))} className="text-rose-400"><X size={14} /></button>
                                    </div>
                                 </div>
                               );
                            })}
                         </div>
                      </div>
                   </div>
                </div>
              </section>

              {/* SECTION 4: BIAYA TAMBAHAN */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-black">04</span>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Biaya & Ongkos Produksi</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Scissors size={14} /> Ongkos Jahit Utama</h4>
                      <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Ongkos Jahit (Per Unit)</label>
                          <div className="relative">
                             <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">Rp</span>
                             <input type="number" value={formData.sewing_cost} onChange={(e) => setFormData({...formData, sewing_cost: e.target.value})} placeholder="0" className="w-full pl-10 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl font-black text-sm outline-none" />
                          </div>
                      </div>
                   </div>

                   <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Calculator size={14} /> Biaya Tambahan Lainnya</h4>
                      <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-4">
                         <div className="flex gap-2">
                            <input placeholder="Label Biaya (Packing/Sablon/dll)" value={tempOtherCost.label} onChange={(e) => setTempOtherCost({...tempOtherCost, label: e.target.value})} className="flex-[2] px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-[10px] outline-none" />
                            <input type="number" placeholder="Rp" value={tempOtherCost.amount} onChange={(e) => setTempOtherCost({...tempOtherCost, amount: e.target.value})} className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-[10px] outline-none" />
                            <button type="button" onClick={handleAddOtherCost} className="p-3 bg-indigo-600 text-white rounded-xl"><Plus size={16} /></button>
                         </div>
                         <div className="space-y-2">
                            {otherCostsList.map((c, i) => (
                               <div key={i} className="flex justify-between items-center p-2.5 bg-indigo-50/50 rounded-xl text-[10px] font-black border border-indigo-100/50">
                                  <span className="text-indigo-900 uppercase">{c.label}</span>
                                  <div className="flex items-center gap-3">
                                     <span className="text-indigo-600">Rp {c.amount.toLocaleString()}</span>
                                     <button type="button" onClick={() => setOtherCostsList(otherCostsList.filter((_, idx) => idx !== i))} className="text-rose-400"><Trash2 size={12} /></button>
                                  </div>
                               </div>
                            ))}
                         </div>
                      </div>
                   </div>
                </div>
              </section>

              <div className="pt-10 border-t border-slate-100 flex gap-4">
                <button type="button" disabled={isSubmitting} onClick={() => setIsModalOpen(false)} className="flex-1 py-5 bg-slate-100 text-slate-500 font-black rounded-[2rem] uppercase tracking-widest text-xs hover:bg-slate-200 transition-all">Batalkan</button>
                <button type="submit" disabled={isSubmitting} className="flex-[2] py-5 bg-indigo-600 text-white font-black rounded-[2rem] shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-4 uppercase tracking-widest text-xs">
                  {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Play size={20} className="fill-current" />} Mulai Produksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
