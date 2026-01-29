
import React, { useContext, useState, useMemo } from 'react';
import { DataContext } from '../App';
import { Wallet, Search, DollarSign, User, CheckCircle2, X, Loader2, Banknote, Eye, Printer, ReceiptText } from 'lucide-react';
import { db } from '../services/supabase';

interface Props {
  isNested?: boolean;
}

export const CustomerReceivables: React.FC<Props> = ({ isNested }) => {
  const context = useContext(DataContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'Tunai' });

  if (!context) return null;
  // Fix: 'locations' is not a property of AppContextType. Destructure only existing properties.
  const { data, refreshData, currentLocationId } = context;

  const sales = data?.Penjualan || [];
  const debts = useMemo(() => {
    return sales.filter((s: any) => {
      const remaining = Number(s.remaining_amount || s.remainingAmount || 0);
      const locId = s.location_id || s.locationId;
      const custName = (s.customer_name || s.customerName || '').toLowerCase();
      
      const hasDebt = remaining > 0;
      const isCurrentLoc = currentLocationId === 'loc-pusat' || locId === currentLocationId;
      const matchesSearch = custName.includes(searchTerm.toLowerCase()) || s.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      return hasDebt && isCurrentLoc && matchesSearch;
    });
  }, [sales, currentLocationId, searchTerm]);

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale || !paymentForm.amount) return;

    const remaining = Number(selectedSale.remaining_amount || selectedSale.remainingAmount || 0);
    const paid = Number(selectedSale.paid_amount || selectedSale.paidAmount || 0);
    const method = selectedSale.payment_method || selectedSale.paymentMethod;

    const newPayment = Number(paymentForm.amount);
    if (newPayment > remaining) return alert("Melebihi sisa piutang!");

    setIsSubmitting(true);
    const updatedPaid = paid + newPayment;
    const updatedRemaining = remaining - newPayment;

    const result = await db.sales.update(selectedSale.id, {
      paid_amount: updatedPaid,
      remaining_amount: updatedRemaining,
      payment_method: `${method}, Pelunasan: ${paymentForm.method}`
    });

    if (result && !result.error) {
      await refreshData();
      setShowReceipt(true);
    } else {
      const errorMsg = result?.error?.message || "Gagal memperbarui database.";
      alert(`Gagal memproses pelunasan: ${errorMsg}`);
    }
    setIsSubmitting(false);
  };

  const safeParseItems = (itemsStr: any) => {
    if (!itemsStr) return [];
    try {
      return typeof itemsStr === 'string' ? JSON.parse(itemsStr) : itemsStr;
    } catch (e) {
      return [];
    }
  };

  const Content = (
    <div className="space-y-6">
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100"><tr className="text-[10px] font-black text-slate-400 uppercase">
            <th className="px-8 py-5">Nota</th><th className="px-8 py-5">Customer</th><th className="px-8 py-5 text-right text-rose-600">Sisa Piutang</th><th className="px-8 py-5 text-center">Aksi</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-50">
            {debts.map((s: any) => {
              const remaining = Number(s.remaining_amount || s.remainingAmount || 0);
              const name = s.customer_name || s.customerName || 'N/A';
              return (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-8 py-6 text-xs font-black">{s.id}</td>
                  <td className="px-8 py-6 text-xs font-bold text-slate-700">{name}</td>
                  <td className="px-8 py-6 text-right font-black text-rose-600">Rp {remaining.toLocaleString()}</td>
                  <td className="px-8 py-6 text-center">
                    <button onClick={() => { 
                      setSelectedSale(s); 
                      setPaymentForm({amount: String(remaining), method: 'Tunai'}); 
                      setIsModalOpen(true); 
                      setShowReceipt(false);
                    }} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase">Bayar</button>
                  </td>
                </tr>
              );
            })}
            {debts.length === 0 && (
              <tr>
                <td colSpan={4} className="px-8 py-10 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">Tidak ada piutang aktif</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && selectedSale && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          {!showReceipt ? (
            <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-black text-slate-800">Pelunasan Nota</h2>
                 <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={24} /></button>
              </div>
              <form onSubmit={handleProcessPayment} className="space-y-6">
                 <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Nota</p>
                    <p className="text-sm font-black text-indigo-600">{selectedSale.id}</p>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nominal Bayar (Rp)</label>
                    <input required type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})} className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl font-black text-slate-800 text-lg outline-none" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Metode Pelunasan</label>
                    <select value={paymentForm.method} onChange={(e) => setPaymentForm({...paymentForm, method: e.target.value})} className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl font-bold text-sm outline-none">
                       <option value="Tunai">Tunai</option>
                       <option value="Transfer">Transfer</option>
                       <option value="Debit">Debit/EDC</option>
                    </select>
                 </div>
                 <button type="submit" disabled={isSubmitting} className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-3">
                    {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />} Konfirmasi Pembayaran
                 </button>
              </form>
            </div>
          ) : (
            <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md relative z-10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 max-h-[90vh]">
               <div id="receipt-print" className="p-10 space-y-8 bg-white overflow-y-auto">
                  <div className="text-center space-y-1">
                     <h1 className="text-2xl font-black text-indigo-600 tracking-tighter uppercase">NUPPU PRO</h1>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bukti Pembayaran Pelunasan</p>
                  </div>
                  <div className="flex justify-between items-start border-t border-b border-slate-100 py-4">
                     <div className="space-y-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase">Customer</p>
                        <p className="text-sm font-black text-slate-800">{selectedSale.customer_name || selectedSale.customerName}</p>
                     </div>
                     <div className="text-right space-y-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase">Tgl Pesan</p>
                        <p className="text-xs font-black text-slate-600">{selectedSale.date}</p>
                     </div>
                  </div>
                  <div className="space-y-4">
                     <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Detail Pesanan Sebelumnya:</p>
                     <div className="space-y-2">
                        {safeParseItems(selectedSale.items).map((item: any, idx: number) => (
                           <div key={idx} className="flex justify-between text-xs">
                              <div className="flex-1 pr-4">
                                 <p className="font-black text-slate-800">{item.productName}</p>
                                 <p className="text-[9px] text-slate-400 font-bold uppercase">{item.color} • {item.size} x {item.qty}</p>
                              </div>
                              <p className="font-black text-slate-800">Rp {(item.price * item.qty).toLocaleString()}</p>
                           </div>
                        ))}
                     </div>
                  </div>
                  <div className="border-t border-dashed border-slate-200 pt-4 space-y-2">
                     <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase">Total Tagihan</span>
                        <span className="text-sm font-black text-slate-800">Rp {Number(selectedSale.total_price).toLocaleString()}</span>
                     </div>
                     <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-indigo-600 uppercase">Bayar Barusan</span>
                        <span className="text-sm font-black text-indigo-600">Rp {Number(paymentForm.amount).toLocaleString()}</span>
                     </div>
                     <div className="flex justify-between items-center border-t border-slate-100 pt-2">
                        <span className="text-[10px] font-black text-rose-400 uppercase">Sisa Piutang</span>
                        <span className="text-sm font-black text-rose-600">Rp {(Number(selectedSale.remaining_amount) - Number(paymentForm.amount)).toLocaleString()}</span>
                     </div>
                  </div>
                  <div className="text-center pt-4">
                     <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Terima Kasih Atas Pelunasannya!</p>
                  </div>
               </div>
               <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4 no-print">
                  <button onClick={() => window.print()} className="flex-1 py-4 bg-white border border-slate-200 font-black rounded-2xl flex items-center justify-center gap-2 text-[10px] uppercase shadow-sm"><Printer size={16} /> Cetak Bukti</button>
                  <button onClick={() => { setIsModalOpen(false); setShowReceipt(false); }} className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl flex items-center justify-center gap-2 text-[10px] uppercase shadow-lg">Selesai</button>
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (isNested) return Content;
  return (<div className="p-8 max-w-7xl mx-auto space-y-8">{Content}</div>);
};
