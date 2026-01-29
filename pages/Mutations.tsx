
import React, { useContext, useState, useMemo } from 'react';
import { DataContext } from '../App';
import { 
  ArrowLeftRight, Plus, Search, Filter, 
  ArrowRight, MapPin, Clock, CheckCircle2, 
  X, Loader2, Package, User, FileText, AlertCircle,
  Trash2, Scale, Hash, Sparkles, Users, ChevronDown, Palette, LayoutGrid, ShoppingCart, Send, Printer, ReceiptText, Download,
  DownloadCloud,
  PlusCircle,
  ArrowDownToLine,
  Layers,
  Box,
  PackagePlus,
  ChevronRight,
  ListPlus,
  ArrowDownLeft,
  Truck,
  Eye,
  UserCheck,
  Info
} from 'lucide-react';
import { db } from '../services/supabase';

interface SizeEntry {
  size: string;
  qty: number;
  maxQty?: number; // Digunakan untuk validasi stok di gudang asal
}

interface StagedItem {
  id: string;
  product_id: string;
  productName: string;
  variant_color: string;
  sizeEntries: SizeEntry[];
  totalQty: number;
}

export const Mutations: React.FC = () => {
  const context = useContext(DataContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // State untuk melihat detail batch mutasi
  const [selectedBatch, setSelectedBatch] = useState<any[] | null>(null);

  if (!context) return null;
  const { data, refreshData, currentUser, loading } = context;
  const locations = data?.Lokasi || [];
  const products = data?.Produk || [];
  const mutations = data?.Mutasi || [];
  const stockUnits = data?.StokUnit || [];

  // --- GROUPING LOGIC FOR INVOICE VIEW ---
  const mutationInvoices = useMemo(() => {
    const groups: Record<string, any[]> = {};
    
    mutations.forEach((m: any) => {
      const batchMatch = m.note?.match(/\[BATCH:([\w-]+)\]/);
      const batchId = batchMatch ? batchMatch[1] : `SINGLE-${m.id}`;
      
      if (!groups[batchId]) groups[batchId] = [];
      groups[batchId].push(m);
    });

    return Object.values(groups)
      .map(group => ({
        batchId: group[0].note?.match(/\[BATCH:([\w-]+)\]/)?.[1] || group[0].id,
        date: group[0].date,
        from: group[0].from_location_id,
        to: group[0].to_location_id,
        admin: group[0].admin_name || 'System',
        totalQty: group.reduce((sum, item) => sum + (Number(item.qty) || 0), 0),
        items: group,
        note: group[0].note?.replace(/\[BATCH:[\w-]+\]/, '').trim()
      }))
      .filter(inv => {
        const search = searchTerm.toLowerCase();
        return inv.batchId.toLowerCase().includes(search) || 
               inv.admin.toLowerCase().includes(search) ||
               inv.note.toLowerCase().includes(search);
      })
      .sort((a, b) => b.items[0].id.localeCompare(a.items[0].id));
  }, [mutations, searchTerm]);

  // --- STATE UNTUK INPUT STOK (ENTRY) ---
  const [entryStagedItems, setEntryStagedItems] = useState<StagedItem[]>([]);
  const [entryForm, setEntryForm] = useState({
    product_id: '',
    variant_color: '',
    to_location_id: 'loc-pusat',
    note: ''
  });
  const [entrySizeTemp, setEntrySizeTemp] = useState({ size: '', qty: '' });
  const [entrySizeEntries, setEntrySizeEntries] = useState<SizeEntry[]>([]);

  // --- STATE UNTUK TRANSFER STOK (BERBASIS STOK FISIK) ---
  const [transferStagedItems, setTransferStagedItems] = useState<StagedItem[]>([]);
  const [transferForm, setTransferForm] = useState({
    from_location_id: 'loc-pusat',
    to_location_id: '',
    note: ''
  });
  const [transferItemTemp, setTransferItemTemp] = useState({
    product_id: '',
    variant_color: ''
  });
  
  // State untuk menampung input qty transfer per size yang tersedia
  const [transferSizeInputs, setTransferSizeInputs] = useState<Record<string, string>>({});

  // Helper: Ambil daftar produk yang ada stoknya di gudang asal
  const availableProductsAtOrigin = useMemo(() => {
    const originStock = stockUnits.filter((s: any) => s.location_id === transferForm.from_location_id && s.qty > 0);
    const prodIds = Array.from(new Set(originStock.map((s: any) => s.product_id)));
    return products.filter((p: any) => prodIds.includes(p.id));
  }, [stockUnits, transferForm.from_location_id, products]);

  // Helper: Ambil daftar warna yang tersedia untuk produk terpilih di gudang asal
  const availableColorsAtOrigin = useMemo(() => {
    if (!transferItemTemp.product_id) return [];
    const originStock = stockUnits.filter((s: any) => 
      s.location_id === transferForm.from_location_id && 
      s.product_id === transferItemTemp.product_id &&
      s.qty > 0
    );
    return Array.from(new Set(originStock.map((s: any) => s.color || 'Umum')));
  }, [stockUnits, transferForm.from_location_id, transferItemTemp.product_id]);

  // Helper: Ambil daftar size & qty tersedia untuk produk + warna terpilih
  const availableSizesAtOrigin = useMemo(() => {
    if (!transferItemTemp.product_id || !transferItemTemp.variant_color) return [];
    return stockUnits.filter((s: any) => 
      s.location_id === transferForm.from_location_id && 
      s.product_id === transferItemTemp.product_id &&
      (s.color || 'Umum') === transferItemTemp.variant_color &&
      s.qty > 0
    );
  }, [stockUnits, transferForm.from_location_id, transferItemTemp.product_id, transferItemTemp.variant_color]);

  const handleAddSizeToList = (type: 'ENTRY') => {
    if (type === 'ENTRY') {
      if (!entrySizeTemp.size || !entrySizeTemp.qty) return;
      const size = entrySizeTemp.size.toUpperCase();
      const qty = Number(entrySizeTemp.qty);

      const existing = entrySizeEntries.findIndex(s => s.size === size);
      if (existing !== -1) {
        const newList = [...entrySizeEntries];
        newList[existing].qty += qty;
        setEntrySizeEntries(newList);
      } else {
        setEntrySizeEntries([...entrySizeEntries, { size, qty }]);
      }
      setEntrySizeTemp({ size: '', qty: '' });
    }
  };

  const handleAddToStaging = (type: 'ENTRY' | 'TRANSFER') => {
    if (type === 'ENTRY') {
      if (!entryForm.product_id || entrySizeEntries.length === 0) return alert("Pilih produk dan isi ukuran!");
      const prod = products.find((p: any) => p.id === entryForm.product_id);
      const newItem: StagedItem = {
        id: crypto.randomUUID(),
        product_id: entryForm.product_id,
        productName: prod?.name || 'Unknown',
        variant_color: entryForm.variant_color || 'Umum',
        sizeEntries: [...entrySizeEntries],
        totalQty: entrySizeEntries.reduce((sum, s) => sum + s.qty, 0)
      };
      setEntryStagedItems([...entryStagedItems, newItem]);
      setEntrySizeEntries([]);
      setEntryForm({ ...entryForm, product_id: '', variant_color: '' });
    } else {
      // Logic Transfer: Ambil semua input size yang tidak kosong
      const sizeEntries: SizeEntry[] = Object.entries(transferSizeInputs)
        .filter(([_, qty]) => Number(qty) > 0)
        .map(([size, qty]) => {
          const stockData = availableSizesAtOrigin.find(s => s.size === size);
          return { size, qty: Number(qty), maxQty: stockData?.qty || 0 };
        });

      if (!transferItemTemp.product_id || sizeEntries.length === 0) return alert("Pilih produk dan isi jumlah transfer!");
      
      // Validasi Stok Berlebih
      const overStock = sizeEntries.find(s => s.qty > (s.maxQty || 0));
      if (overStock) return alert(`Jumlah transfer size ${overStock.size} melebihi stok tersedia (${overStock.maxQty})!`);

      const prod = products.find((p: any) => p.id === transferItemTemp.product_id);
      const newItem: StagedItem = {
        id: crypto.randomUUID(),
        product_id: transferItemTemp.product_id,
        productName: prod?.name || 'Unknown',
        variant_color: transferItemTemp.variant_color || 'Umum',
        sizeEntries: sizeEntries,
        totalQty: sizeEntries.reduce((sum, s) => sum + s.qty, 0)
      };

      setTransferStagedItems([...transferStagedItems, newItem]);
      setTransferSizeInputs({});
      setTransferItemTemp({ product_id: '', variant_color: '' });
    }
  };

  const handleFinalEntrySubmit = async () => {
    if (entryStagedItems.length === 0) return;
    setIsSubmitting(true);
    const today = new Date().toISOString().split('T')[0];
    const batchId = `ENT-${Date.now()}`;

    try {
      for (const item of entryStagedItems) {
        const sizeNote = item.sizeEntries.map(s => `${s.size}:${s.qty}`).join(', ');
        await db.mutations.create({
          id: `ENT-ROW-${Date.now()}-${Math.floor(Math.random()*1000)}`,
          date: today,
          from_location_id: 'ENTRY_MANUAL',
          to_location_id: entryForm.to_location_id,
          product_id: item.product_id,
          qty: item.totalQty,
          note: `[BATCH:${batchId}] ${entryForm.note || 'Input Manual'} - Varian: ${item.variant_color} (${sizeNote})`,
          admin_name: currentUser?.name || 'Admin'
        });

        for (const sizeEntry of item.sizeEntries) {
          await db.inventory.adjustStock(item.product_id, entryForm.to_location_id, item.variant_color, sizeEntry.size, sizeEntry.qty);
        }
      }
      await refreshData();
      setIsBulkModalOpen(false);
      setEntryStagedItems([]);
      alert("Seluruh stok berhasil ditambahkan!");
    } catch (e) {
      console.error(e);
      alert("Terjadi kesalahan saat menyimpan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalTransferSubmit = async () => {
    if (transferStagedItems.length === 0) return;
    if (!transferForm.to_location_id) return alert("Pilih gudang tujuan!");
    if (transferForm.from_location_id === transferForm.to_location_id) return alert("Gudang Asal dan Tujuan tidak boleh sama!");
    
    setIsSubmitting(true);
    const today = new Date().toISOString().split('T')[0];
    const batchId = `TRF-${Date.now()}`;

    try {
      for (const item of transferStagedItems) {
        const sizeNote = item.sizeEntries.map(s => `${s.size}:${s.qty}`).join(', ');
        await db.mutations.create({
          id: `TRF-ROW-${Date.now()}-${Math.floor(Math.random()*1000)}`,
          date: today,
          from_location_id: transferForm.from_location_id,
          to_location_id: transferForm.to_location_id,
          product_id: item.product_id,
          qty: item.totalQty,
          note: `[BATCH:${batchId}] ${transferForm.note || 'Transfer Stok'} - Varian: ${item.variant_color} (${sizeNote})`,
          admin_name: currentUser?.name || 'Admin'
        });

        for (const sizeEntry of item.sizeEntries) {
          await db.inventory.adjustStock(item.product_id, transferForm.from_location_id, item.variant_color, sizeEntry.size, -sizeEntry.qty);
          await db.inventory.adjustStock(item.product_id, transferForm.to_location_id, item.variant_color, sizeEntry.size, sizeEntry.qty);
        }
      }
      await refreshData();
      setIsModalOpen(false);
      setTransferStagedItems([]);
      alert("Seluruh barang berhasil ditransfer!");
    } catch (e) {
      console.error(e);
      alert("Terjadi kesalahan saat transfer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Invoice Mutasi Stok</h1>
          <p className="text-slate-500 font-medium">Log perpindahan barang terpusat berdasarkan transaksi batch.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setIsBulkModalOpen(true)} className="bg-emerald-600 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center gap-3">
            <PackagePlus size={18} /> Stok Masuk (Bulk)
          </button>
          <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-3">
            <ArrowLeftRight size={18} /> Transfer Massal
          </button>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input type="text" placeholder="Cari ID Invoice, Admin, atau Catatan..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm" />
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 bg-slate-50/10">
                   <th className="px-8 py-5">Tgl & ID Invoice</th>
                   <th className="px-8 py-5">Admin / Pelaksana</th>
                   <th className="px-8 py-5">Rute Perpindahan</th>
                   <th className="px-8 py-5 text-right">Total Qty</th>
                   <th className="px-8 py-5 text-center">Aksi</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {mutationInvoices.map((inv) => (
                    <tr key={inv.batchId} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-8 py-5">
                        <p className="text-xs font-black text-slate-800">{inv.date}</p>
                        <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-tighter">{inv.batchId}</p>
                      </td>
                      <td className="px-8 py-5">
                         <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400"><User size={14} /></div>
                            <p className="text-xs font-black text-slate-700">{inv.admin}</p>
                         </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-tighter">
                          <span className={inv.from === 'ENTRY_MANUAL' ? 'text-emerald-500' : 'text-slate-500'}>
                             {inv.from === 'ENTRY_MANUAL' ? 'STOCK ENTRY' : (locations.find(l => l.id === inv.from)?.name || 'N/A')}
                          </span>
                          <ArrowRight size={10} className="text-slate-300" />
                          <span className="text-indigo-600">{locations.find(l => l.id === inv.to)?.name || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right font-black text-slate-900">{inv.totalQty} <span className="text-[9px] text-slate-400">PCS</span></td>
                      <td className="px-8 py-5 text-center">
                         <button onClick={() => setSelectedBatch(inv.items)} className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all"><Eye size={16} /></button>
                      </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

      {/* MODAL: DETAIL INVOICE MUTASI */}
      {selectedBatch && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setSelectedBatch(null)}></div>
           <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl relative z-10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 max-h-[85vh]">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                 <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg"><ReceiptText size={24} /></div>
                    <div>
                       <h2 className="text-xl font-black text-slate-800 tracking-tight">Rincian Invoice Mutasi</h2>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                          {selectedBatch[0].date} • Oleh: {selectedBatch[0].admin_name}
                       </p>
                    </div>
                 </div>
                 <button onClick={() => setSelectedBatch(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={24} /></button>
              </div>
              <div className="p-8 overflow-y-auto space-y-6 flex-1 bg-slate-50/30">
                 <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-4 bg-white rounded-2xl border border-slate-100">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Dari Lokasi</p>
                       <p className="text-xs font-black text-slate-700">{selectedBatch[0].from_location_id === 'ENTRY_MANUAL' ? 'STOCK ENTRY' : locations.find(l => l.id === selectedBatch[0].from_location_id)?.name}</p>
                    </div>
                    <div className="p-4 bg-white rounded-2xl border border-slate-100">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Ke Lokasi</p>
                       <p className="text-xs font-black text-indigo-600">{locations.find(l => l.id === selectedBatch[0].to_location_id)?.name}</p>
                    </div>
                 </div>
                 
                 <div className="space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Daftar Produk Terlibat</p>
                    {selectedBatch.map((item, idx) => {
                       const prod = products.find(p => p.id === item.product_id);
                       return (
                          <div key={idx} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                             <div className="flex items-center gap-4">
                                <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl"><Package size={20} /></div>
                                <div>
                                   <p className="text-xs font-black text-slate-800">{prod?.name || 'Item'}</p>
                                   <div className="flex items-center gap-2 mt-1">
                                      <span className="text-[8px] font-black bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                         {item.note?.match(/Varian: (.*?) \(/)?.[1] || 'Umum'}
                                      </span>
                                      <span className="text-[8px] font-bold text-slate-400 uppercase italic">
                                         {item.note?.match(/\((.*?)\)/)?.[1] || '-'}
                                      </span>
                                   </div>
                                </div>
                             </div>
                             <div className="text-right">
                                <p className="text-lg font-black text-slate-900">{item.qty} <span className="text-xs text-slate-400 uppercase">Pcs</span></p>
                             </div>
                          </div>
                       );
                    })}
                 </div>
              </div>
              <div className="p-8 bg-white border-t border-slate-100 flex gap-4">
                 <button className="flex-1 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-200 transition-all"><Printer size={16} /> Cetak Nota</button>
                 <button onClick={() => setSelectedBatch(null)} className="flex-1 py-4 bg-slate-900 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest">Tutup</button>
              </div>
           </div>
        </div>
      )}

      {/* --- MODAL 1: INPUT STOK MASSAL (ENTRY) --- */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={() => !isSubmitting && setIsBulkModalOpen(false)}></div>
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-4xl relative z-10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 max-h-[92vh]">
             <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-emerald-50/50">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg"><PlusCircle size={24} /></div>
                  <div>
                    <h2 className="text-xl font-black text-slate-800 tracking-tight">Input Stok Masuk Kolektif</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Tambahkan berbagai produk sekaligus tanpa jalur produksi</p>
                  </div>
                </div>
                <button onClick={() => setIsBulkModalOpen(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full"><X size={24} /></button>
             </div>

             <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
                <div className="w-full lg:w-1/2 p-8 border-r border-slate-100 overflow-y-auto space-y-6">
                   <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lokasi Tujuan</label>
                        <select value={entryForm.to_location_id} onChange={(e) => setEntryForm({...entryForm, to_location_id: e.target.value})} className="w-full px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-xl font-black text-xs uppercase tracking-widest text-emerald-700 outline-none">
                           {locations.map((l:any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                      </div>
                      <div className="h-px bg-slate-100 w-full my-4"></div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pilih Produk</label>
                        <select value={entryForm.product_id} onChange={(e) => setEntryForm({...entryForm, product_id: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none">
                           <option value="">-- Cari Produk --</option>
                           {products.map((p:any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Varian Warna</label>
                        <input value={entryForm.variant_color} onChange={(e) => setEntryForm({...entryForm, variant_color: e.target.value})} placeholder="Contoh: Maroon" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none" />
                      </div>
                   </div>

                   <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                      <div className="flex gap-4 items-end">
                         <div className="flex-1 space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Size</label>
                            <input value={entrySizeTemp.size} onChange={(e) => setEntrySizeTemp({...entrySizeTemp, size: e.target.value})} placeholder="S,M,L" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-xs" />
                         </div>
                         <div className="flex-1 space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Qty</label>
                            <input type="number" value={entrySizeTemp.qty} onChange={(e) => setEntrySizeTemp({...entrySizeTemp, qty: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-xs" />
                         </div>
                         <button type="button" onClick={() => handleAddSizeToList('ENTRY')} className="mt-5 p-2 bg-emerald-600 text-white rounded-xl"><Plus size={20} /></button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                         {entrySizeEntries.map((s, i) => (
                           <div key={i} className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-black flex items-center gap-2">
                              {s.size}: {s.qty} <button onClick={() => setEntrySizeEntries(entrySizeEntries.filter((_, idx) => idx !== i))}><X size={12} className="text-rose-400" /></button>
                           </div>
                         ))}
                      </div>
                   </div>

                   <button type="button" onClick={() => handleAddToStaging('ENTRY')} className="w-full py-4 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-black transition-all flex items-center justify-center gap-2">
                      <ListPlus size={16} /> Tambahkan ke Antrean
                   </button>
                </div>

                <div className="w-full lg:w-1/2 p-8 bg-slate-50/30 overflow-y-auto">
                   <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex justify-between">
                      Antrean Barang <span>{entryStagedItems.length} Item</span>
                   </h3>
                   <div className="space-y-3">
                      {entryStagedItems.map(item => (
                        <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm animate-in slide-in-from-right-4">
                           <div className="flex justify-between items-start">
                              <div>
                                 <p className="text-xs font-black text-slate-800">{item.productName}</p>
                                 <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-tighter">{item.variant_color}</p>
                              </div>
                              <button onClick={() => setEntryStagedItems(entryStagedItems.filter(i => i.id !== item.id))} className="text-rose-400"><Trash2 size={16} /></button>
                           </div>
                           <div className="mt-3 flex flex-wrap gap-1.5">
                              {item.sizeEntries.map((se, i) => (
                                <span key={i} className="px-2 py-0.5 bg-slate-100 text-[9px] font-black text-slate-500 rounded uppercase">{se.size}: {se.qty}</span>
                              ))}
                              <span className="ml-auto text-[10px] font-black text-emerald-600">Total: {item.totalQty}</span>
                           </div>
                        </div>
                      ))}
                      {entryStagedItems.length === 0 && (
                        <div className="h-64 border-2 border-dashed border-slate-100 rounded-[2rem] flex flex-col items-center justify-center text-slate-300">
                           <Box size={40} strokeWidth={1} className="mb-2 opacity-20" />
                           <p className="text-[10px] font-black uppercase tracking-widest">Antrean Kosong</p>
                        </div>
                      )}
                   </div>
                </div>
             </div>

             <div className="p-8 border-t border-slate-100 bg-white flex gap-4">
                <button disabled={isSubmitting} onClick={() => setIsBulkModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl uppercase tracking-widest text-[10px]">Batal</button>
                <button disabled={isSubmitting || entryStagedItems.length === 0} onClick={handleFinalEntrySubmit} className="flex-[2] py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-3 uppercase tracking-widest text-[10px]">
                   {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />} Konfirmasi & Simpan Stok
                </button>
             </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: TRANSFER STOK MASSAL (FIXED - BERDASARKAN STOK FISIK) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={() => !isSubmitting && setIsModalOpen(false)}></div>
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl relative z-10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 max-h-[92vh]">
             <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg"><Truck size={24} /></div>
                  <div>
                    <h2 className="text-xl font-black text-slate-800 tracking-tight">Transfer Stok Massal</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Pindahkan barang yang tersedia antar gudang</p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full"><X size={24} /></button>
             </div>

             <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
                <div className="w-full lg:w-1/2 p-8 border-r border-slate-100 overflow-y-auto space-y-6">
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dari Gudang (Asal)</label>
                        <select value={transferForm.from_location_id} onChange={(e) => {
                          setTransferForm({...transferForm, from_location_id: e.target.value});
                          setTransferItemTemp({ product_id: '', variant_color: '' });
                          setTransferSizeInputs({});
                        }} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-black text-[10px] outline-none focus:ring-2 focus:ring-indigo-500">
                           {locations.map((l:any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1">Ke Gudang Tujuan</label>
                        <select value={transferForm.to_location_id} onChange={(e) => setTransferForm({...transferForm, to_location_id: e.target.value})} className="w-full px-3 py-2.5 bg-indigo-50 border border-indigo-100 rounded-xl font-black text-[10px] text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-500">
                           <option value="">Pilih Tujuan...</option>
                           {locations.map((l:any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                      </div>
                   </div>

                   <div className="h-px bg-slate-100 w-full my-2"></div>

                   <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pilih Produk Tersedia</label>
                        <select value={transferItemTemp.product_id} onChange={(e) => {
                          setTransferItemTemp({...transferItemTemp, product_id: e.target.value, variant_color: ''});
                          setTransferSizeInputs({});
                        }} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none">
                           <option value="">-- Pilih Produk di Gudang Asal --</option>
                           {availableProductsAtOrigin.map((p:any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pilih Warna Tersedia</label>
                        <select disabled={!transferItemTemp.product_id} value={transferItemTemp.variant_color} onChange={(e) => {
                          setTransferItemTemp({...transferItemTemp, variant_color: e.target.value});
                          setTransferSizeInputs({});
                        }} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none disabled:opacity-40">
                           <option value="">-- Pilih Varian Warna --</option>
                           {availableColorsAtOrigin.map((c:any) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                   </div>

                   {/* DAFTAR UKURAN BERDASARKAN STOK */}
                   <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Scale size={16} className="text-indigo-600" />
                        <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Rincian Stok & Input Transfer</h4>
                      </div>
                      
                      <div className="space-y-2">
                         {availableSizesAtOrigin.map((s: any) => (
                           <div key={s.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 group">
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-[10px] uppercase">{s.size}</div>
                                 <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Stok Tersedia</p>
                                    <p className="text-xs font-black text-slate-700">{s.qty} PCS</p>
                                 </div>
                              </div>
                              <div className="flex items-center gap-2">
                                 <ArrowRight size={14} className="text-slate-200" />
                                 <input 
                                    type="number" 
                                    placeholder="0"
                                    min="0"
                                    max={s.qty}
                                    value={transferSizeInputs[s.size] || ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (Number(val) > s.qty) return;
                                      setTransferSizeInputs({...transferSizeInputs, [s.size]: val});
                                    }}
                                    className="w-20 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-lg text-right font-black text-xs text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-500" 
                                 />
                              </div>
                           </div>
                         ))}
                         {(!transferItemTemp.product_id || !transferItemTemp.variant_color) && (
                           <div className="py-8 text-center flex flex-col items-center justify-center text-slate-300">
                              <Info size={32} strokeWidth={1} className="mb-2 opacity-20" />
                              <p className="text-[9px] font-black uppercase tracking-widest">Pilih Produk & Warna Dahulu</p>
                           </div>
                         )}
                         {availableSizesAtOrigin.length === 0 && transferItemTemp.variant_color && (
                           <p className="text-[10px] font-bold text-rose-400 text-center py-4 uppercase">Stok Kosong!</p>
                         )}
                      </div>
                   </div>

                   <button type="button" onClick={() => handleAddToStaging('TRANSFER')} className="w-full py-4 bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100">
                      <ListPlus size={16} /> Tambahkan ke Antrean Transfer
                   </button>
                </div>

                <div className="w-full lg:w-1/2 p-8 bg-slate-50/30 overflow-y-auto">
                   <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex justify-between">
                      Antrean Transfer <span>{transferStagedItems.length} Item</span>
                   </h3>
                   <div className="space-y-3">
                      {transferStagedItems.map(item => (
                        <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm animate-in slide-in-from-right-4">
                           <div className="flex justify-between items-start">
                              <div>
                                 <p className="text-xs font-black text-slate-800">{item.productName}</p>
                                 <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-tighter">{item.variant_color}</p>
                              </div>
                              <button onClick={() => setTransferStagedItems(transferStagedItems.filter(i => i.id !== item.id))} className="text-rose-400"><Trash2 size={16} /></button>
                           </div>
                           <div className="mt-3 flex flex-wrap gap-1.5">
                              {item.sizeEntries.map((se, i) => (
                                <span key={i} className="px-2 py-0.5 bg-slate-100 text-[9px] font-black text-slate-500 rounded uppercase">{se.size}: {se.qty}</span>
                              ))}
                              <span className="ml-auto text-[10px] font-black text-indigo-600">Total: {item.totalQty}</span>
                           </div>
                        </div>
                      ))}
                      {transferStagedItems.length === 0 && (
                        <div className="h-64 border-2 border-dashed border-slate-100 rounded-[2rem] flex flex-col items-center justify-center text-slate-300">
                           <Truck size={40} strokeWidth={1} className="mb-2 opacity-20" />
                           <p className="text-[10px] font-black uppercase tracking-widest">Belum ada barang dipilih</p>
                        </div>
                      )}
                   </div>
                </div>
             </div>

             <div className="p-8 border-t border-slate-100 bg-white flex gap-4">
                <button disabled={isSubmitting} onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl uppercase tracking-widest text-[10px]">Batal</button>
                <button disabled={isSubmitting || transferStagedItems.length === 0} onClick={handleFinalTransferSubmit} className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-3 uppercase tracking-widest text-[10px]">
                   {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />} Konfirmasi Transfer Massal
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
