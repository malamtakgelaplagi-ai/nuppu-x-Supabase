
import React, { useContext, useState, useMemo, useEffect } from 'react';
import { DataContext } from '../App';
import { 
  ReceiptText, Calendar, MapPin, 
  Building2, Plus, X, Loader2, CheckCircle2, History, Banknote, Eye, Info, Clock, Search,
  AlertCircle
} from 'lucide-react';
import { db } from '../services/supabase';

interface Props {
  isNested?: boolean;
}

export const ConsignmentBilling: React.FC<Props> = ({ isNested }) => {
  const context = useContext(DataContext);
  const [activeTab, setActiveTab] = useState<'billing' | 'history'>('billing');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [selectedSaleForDetail, setSelectedSaleForDetail] = useState<any>(null);
  
  const [dateFilter, setDateFilter] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  if (!context) return null;
  const { data, refreshData, currentUser, showModal } = context;

  const isKasir = currentUser?.role === 'KASIR';
  const initialCabangId = isKasir ? currentUser?.location_id || 'all' : 'all';
  const [selectedCabangId, setSelectedCabangId] = useState<string>(initialCabangId);

  useEffect(() => {
    if (isKasir && currentUser) {
      setSelectedCabangId(currentUser.location_id);
    }
  }, [currentUser, isKasir]);

  const [setoranForm, setSetoranForm] = useState({
    date: new Date().toISOString().split('T')[0],
    location_id: isKasir && currentUser ? currentUser.location_id : '',
    amount: '',
    payment_method: 'Transfer',
    note: ''
  });

  const sales = data?.Penjualan || [];
  const settlements = data?.SetoranCabang || [];
  const locations = data?.Lokasi || [];

  const branchSales = useMemo(() => {
    return sales.filter((s: any) => {
      const isConsignment = s.type === 'KONSINYASI';
      const matchesCabang = selectedCabangId === 'all' || s.location_id === selectedCabangId;
      const matchesSearch = (s.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                            s.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      return isConsignment && matchesCabang && matchesSearch;
    });
  }, [sales, selectedCabangId, searchTerm]);

  const filteredSettlements = useMemo(() => {
    return settlements.filter((s: any) => {
      const matchesCabang = selectedCabangId === 'all' || s.location_id === selectedCabangId;
      const matchesDate = s.date >= dateFilter.start && s.date <= dateFilter.end;
      return matchesCabang && matchesDate;
    }).reverse();
  }, [settlements, selectedCabangId, dateFilter]);

  const handleSaveSetoran = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setoranForm.location_id || !setoranForm.amount) return;

    setIsSubmitting(true);
    try {
      const result = await db.settlements.create({
        id: `SET-${Date.now()}`,
        date: setoranForm.date,
        location_id: setoranForm.location_id,
        amount: Number(setoranForm.amount),
        payment_method: setoranForm.payment_method,
        note: setoranForm.note
      });

      if (result && !result.error) {
        await refreshData();
        setIsModalOpen(false);
        setSetoranForm({ date: new Date().toISOString().split('T')[0], location_id: isKasir && currentUser ? currentUser.location_id : '', amount: '', payment_method: 'Transfer', note: '' });
        showModal({ title: 'Berhasil', message: 'Setoran kolektif berhasil dicatat.', type: 'success' });
      } else {
        showModal({ title: 'Gagal', message: 'Gagal mencatat setoran: ' + (result?.error?.message || 'Error'), type: 'error' });
      }
    } catch (err: any) {
      showModal({ title: 'Error', message: err.message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const executePaymentAction = async (sale: any) => {
    setIsSubmitting(true);
    const amountToPay = Number(sale.total_consignment || 0);

    try {
      const setoranResult = await db.settlements.create({
        id: `SET-INV-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        location_id: sale.location_id,
        amount: amountToPay,
        payment_method: 'Nota Lunas',
        note: `Pelunasan otomatis nota: ${sale.id}`
      });

      if (setoranResult && !setoranResult.error) {
        const updateResult = await db.sales.update(sale.id, {
          paid_amount: Number(sale.total_price),
          remaining_amount: 0,
          status: 'PAID',
          type: 'RETAIL'
        });

        if (updateResult && !updateResult.error) {
          await refreshData();
          setSelectedSaleForDetail(null);
          showModal({ title: 'Pelunasan Berhasil', message: 'Nota telah diupdate menjadi Retail Lunas dan dana masuk ke sistem pusat.', type: 'success' });
        } else {
          showModal({ title: 'Update Gagal', message: 'Setoran masuk, namun status nota gagal diperbarui.', type: 'error' });
        }
      } else {
        showModal({ title: 'Gagal', message: 'Gagal membuat record setoran pusat.', type: 'error' });
      }
    } catch (err: any) {
      showModal({ title: 'System Error', message: err.message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecutePaymentFromInvoice = (sale: any) => {
    if (!sale) return;
    const amountToPay = Number(sale.total_consignment || 0);
    
    if (amountToPay <= 0) {
      showModal({ title: 'Data Tidak Valid', message: 'Nominal setoran Rp 0. Periksa margin lokasi di Master Data.', type: 'error' });
      return;
    }

    showModal({
      title: 'Konfirmasi Pelunasan',
      message: `Konfirmasi dana setor untuk nota ${sale.id} sebesar Rp ${amountToPay.toLocaleString()}?`,
      type: 'confirm',
      confirmLabel: 'Ya, Lunasi',
      onConfirm: () => executePaymentAction(sale)
    });
  };

  const safeParseItems = (itemsStr: any) => {
    if (!itemsStr) return [];
    try { return typeof itemsStr === 'string' ? JSON.parse(itemsStr) : itemsStr; } catch (e) { return []; }
  };

  const Content = (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex bg-slate-100 p-1 rounded-2xl w-full md:w-auto shadow-inner">
           <button onClick={() => setActiveTab('billing')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'billing' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}><ReceiptText size={14} /> Tagihan Aktif</button>
           <button onClick={() => setActiveTab('history')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}><History size={14} /> Riwayat Setoran</button>
        </div>
        
        {activeTab === 'billing' ? (
           <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <Clock size={14} />
              <span className="text-[10px] font-black uppercase">Daftar Tagihan Belum Disetor</span>
           </div>
        ) : (
           <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
             <Calendar size={14} className="text-slate-400" />
             <input type="date" value={dateFilter.start} onChange={(e) => setDateFilter({...dateFilter, start: e.target.value})} className="text-[10px] font-black outline-none bg-transparent" />
             <span className="text-[10px] font-black text-slate-300">s/d</span>
             <input type="date" value={dateFilter.end} onChange={(e) => setDateFilter({...dateFilter, end: e.target.value})} className="text-[10px] font-black outline-none bg-transparent" />
           </div>
        )}
      </div>

      {activeTab === 'billing' ? (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-300">
            <div className="p-6 border-b border-slate-50 bg-slate-50/30">
               <div className="relative max-w-md">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input 
                    type="text" 
                    placeholder="Cari No. Nota atau Nama Customer..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                  />
               </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 border-b border-slate-100">
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-8 py-5">Nota & Tanggal</th>
                    <th className="px-8 py-5">Customer</th>
                    <th className="px-8 py-5">Asal Cabang</th>
                    <th className="px-8 py-5 text-right text-rose-600">Wajib Setor</th>
                    <th className="px-8 py-5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {branchSales.map((s: any) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-8 py-6">
                        <p className="text-xs font-black text-slate-800">{s.id}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-tighter">{s.date}</p>
                      </td>
                      <td className="px-8 py-6 text-xs font-black text-slate-700">{s.customer_name || 'Umum'}</td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                           <MapPin size={12} className="text-indigo-400" />
                           <span className="text-[10px] font-black uppercase text-indigo-600">
                             {locations.find(l => l.id === s.location_id)?.name || 'Cabang'}
                           </span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right font-black text-rose-600">
                         Rp {Number(s.total_consignment || 0).toLocaleString()}
                      </td>
                      <td className="px-8 py-6 text-center">
                        <button onClick={() => setSelectedSaleForDetail(s)} className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                           <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {branchSales.length === 0 && (
                     <tr>
                        <td colSpan={5} className="px-8 py-24 text-center text-slate-300 font-black uppercase text-[10px] tracking-widest">
                           <ReceiptText size={48} className="mx-auto mb-4 opacity-10" />
                           Semua tagihan cabang sudah lunas terjadwal
                        </td>
                     </tr>
                  )}
                </tbody>
              </table>
            </div>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-300">
           <div className="overflow-x-auto">
             <table className="w-full text-left">
               <thead className="bg-slate-50/50 border-b border-slate-100">
                 <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                   <th className="px-8 py-5">Tgl Setoran</th>
                   <th className="px-8 py-5">Asal Cabang</th>
                   <th className="px-8 py-5">Metode</th>
                   <th className="px-8 py-5 text-right text-emerald-600">Nominal</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                 {filteredSettlements.map((s: any) => (
                   <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                     <td className="px-8 py-5 text-xs font-black text-slate-800">{s.date}</td>
                     <td className="px-8 py-5 text-xs font-bold text-slate-600">{locations.find(l => l.id === s.location_id)?.name || 'N/A'}</td>
                     <td className="px-8 py-5 text-[10px] font-black uppercase text-indigo-600">{s.payment_method}</td>
                     <td className="px-8 py-5 text-right font-black text-emerald-600 text-sm">Rp {Number(s.amount).toLocaleString()}</td>
                   </tr>
                 ))}
                 {filteredSettlements.length === 0 && (
                    <tr><td colSpan={4} className="px-8 py-20 text-center text-slate-300 font-black text-[10px] uppercase tracking-widest">Belum ada riwayat setoran dalam periode ini</td></tr>
                 )}
               </tbody>
             </table>
           </div>
        </div>
      )}

      {selectedSaleForDetail && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300" onClick={() => !isSubmitting && setSelectedSaleForDetail(null)}></div>
           <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md relative z-10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 max-h-[85vh]">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                 <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg"><Info size={24} /></div>
                    <div>
                       <h2 className="text-xl font-black text-slate-800 tracking-tight">Verifikasi Nota Cabang</h2>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{selectedSaleForDetail.id}</p>
                    </div>
                 </div>
                 <button onClick={() => !isSubmitting && setSelectedSaleForDetail(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={24} /></button>
              </div>
              <div className="p-10 overflow-y-auto space-y-6 flex-1 bg-slate-50/30">
                 <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Customer</p>
                       <p className="text-sm font-black text-slate-800">{selectedSaleForDetail.customer_name || 'Umum'}</p>
                    </div>
                    <div className="space-y-1 text-right">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Lokasi Transaksi</p>
                       <p className="text-[10px] font-black text-indigo-600 uppercase">
                          {locations.find(l => l.id === selectedSaleForDetail.location_id)?.name}
                       </p>
                    </div>
                 </div>
                 <div className="space-y-4 pt-4 border-t border-slate-100">
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Item Terjual:</p>
                    <div className="space-y-3">
                       {safeParseItems(selectedSaleForDetail.items).map((item: any, idx: number) => (
                          <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                             <div>
                                <p className="text-xs font-black text-slate-800">{item.productName}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{item.color} • {item.size} x {item.qty}</p>
                             </div>
                             <p className="text-xs font-black text-slate-700">Rp {(item.price * item.qty).toLocaleString()}</p>
                          </div>
                       ))}
                    </div>
                 </div>
                 <div className="pt-6 border-t border-dashed border-slate-200 space-y-2">
                    <div className="flex justify-between items-center">
                       <span className="text-[10px] font-black text-slate-400 uppercase">Nilai Penjualan Cabang</span>
                       <span className="text-sm font-black text-slate-800">Rp {Number(selectedSaleForDetail.total_price).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                       <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Wajib Setor (Net Pusat)</span>
                       <span className="text-lg font-black text-rose-600">
                          Rp {Number(selectedSaleForDetail.total_consignment || 0).toLocaleString()}
                       </span>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                       <span className="text-[10px] font-black text-emerald-600 uppercase">Margin Laba Cabang</span>
                       <span className="text-xs font-black text-emerald-600">
                          Rp {(Number(selectedSaleForDetail.total_price) - Number(selectedSaleForDetail.total_consignment || 0)).toLocaleString()}
                       </span>
                    </div>
                 </div>
              </div>
              <div className="p-8 bg-white border-t border-slate-100 flex flex-col gap-3">
                 <button 
                    disabled={isSubmitting}
                    onClick={() => handleExecutePaymentFromInvoice(selectedSaleForDetail)}
                    className="w-full py-4.5 bg-emerald-600 text-white font-black rounded-2xl text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-emerald-100 transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
                 >
                    {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />} 
                    Konfirmasi Pelunasan Ke Pusat
                 </button>
                 <button disabled={isSubmitting} onClick={() => setSelectedSaleForDetail(null)} className="w-full py-3 bg-slate-100 text-slate-500 font-black rounded-xl text-[9px] uppercase tracking-widest">Tutup</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );

  if (isNested) return Content;
  return (<div className="p-8 max-w-7xl mx-auto space-y-8 min-h-screen">{Content}</div>);
};
