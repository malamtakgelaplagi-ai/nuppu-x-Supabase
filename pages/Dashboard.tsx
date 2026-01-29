
import React, { useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, Activity, AlertCircle, 
  Package, CheckCircle2, ShoppingCart, 
  Wallet, ArrowUpRight, ArrowDownRight, Layers,
  Store, ShoppingBag, Banknote, Building2, Minus
} from 'lucide-react';
import { DataContext } from '../App';

export const Dashboard: React.FC = () => {
  const context = useContext(DataContext);
  const navigate = useNavigate();
  
  if (!context) return null;
  const { data, loading } = context;

  const products = data?.Produk || [];
  const sales = data?.Penjualan || [];
  const production = data?.Produksi || [];

  const activeProductionCount = production.filter((b: any) => b.status === 'PROSES').length;
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  // Pemisahan Omzet Pusat Terkonsolidasi
  const monthlyStats = useMemo(() => {
    let directGross = 0;
    let directDiscount = 0;
    let consignmentShare = 0;

    sales.filter((s: any) => {
      const d = new Date(s.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).forEach((s: any) => {
      if (s.location_id === 'loc-pusat') {
        // Omzet pusat dari jualan sendiri
        // total_price di sistem adalah NET, jadi kita hitung gross untuk display
        const net = Number(s.total_price) || 0;
        const disc = Number(s.total_discount) || 0;
        directGross += (net + disc);
        directDiscount += disc;
      } else {
        // Omzet pusat dari hak bagi hasil di cabang (Wajib Setor)
        consignmentShare += (Number(s.total_consignment) || 0);
      }
    });

    const directNet = directGross - directDiscount;

    return {
      totalConsolidated: directNet + consignmentShare,
      directGross,
      directDiscount,
      directNet,
      consignmentShare
    };
  }, [sales, currentMonth, currentYear]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard Overview</h1>
        <p className="text-slate-500 font-medium">Monitoring produksi dan pendapatan terkonsolidasi.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-700 text-indigo-600"><Layers size={140} /></div>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2"><Activity size={14} className="text-indigo-600" /> Produksi Aktif</p>
          <h3 className="text-4xl font-black text-slate-900">{activeProductionCount} <span className="text-sm text-slate-400 font-bold uppercase tracking-widest ml-1">Batch</span></h3>
          <button onClick={() => navigate('/production')} className="mt-4 text-[9px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1.5 group-hover:gap-3 transition-all">Lihat Antrean <ArrowUpRight size={14} /></button>
        </div>

        <div className="bg-indigo-600 p-8 rounded-[2.5rem] shadow-xl shadow-indigo-100 text-white md:col-span-2 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
           
           <div className="flex-1 space-y-2 relative z-10">
              <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-2"><Banknote size={14} /> Total Omzet Bersih Pusat</p>
              <h3 className="text-5xl font-black tracking-tight">Rp {monthlyStats.totalConsolidated.toLocaleString()}</h3>
              <p className="text-indigo-300 text-[9px] font-bold uppercase tracking-widest mt-2 opacity-80">Bulan {new Date().toLocaleString('id-ID', { month: 'long' })} {currentYear}</p>
           </div>

           <div className="w-full md:w-px h-px md:h-32 bg-white/20"></div>

           <div className="flex flex-col gap-6 relative z-10 min-w-[200px]">
              <div className="space-y-1">
                 <p className="text-indigo-200 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5"><ShoppingCart size={12} /> Penjualan Langsung</p>
                 <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-100/60">
                    <span>Rp {monthlyStats.directGross.toLocaleString()}</span>
                    <Minus size={10} />
                    <span className="text-rose-300">Rp {monthlyStats.directDiscount.toLocaleString()} (Disc)</span>
                 </div>
                 <p className="text-xl font-black text-white">Rp {monthlyStats.directNet.toLocaleString()}</p>
              </div>
              <div className="space-y-1 pt-4 border-t border-white/10">
                 <p className="text-indigo-200 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5"><Building2 size={12} /> Bagi Hasil Cabang (Net)</p>
                 <p className="text-xl font-black text-white">Rp {monthlyStats.consignmentShare.toLocaleString()}</p>
                 <p className="text-[8px] font-bold text-indigo-300 uppercase">Setoran Dari Seluruh Cabang</p>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
             <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl"><Package size={20} /></div>
             <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Model SKU</p>
                <p className="text-lg font-black text-slate-800">{products.length}</p>
             </div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
             <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><CheckCircle2 size={20} /></div>
             <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Penjualan Berhasil</p>
                <p className="text-lg font-black text-slate-800">{sales.filter((s:any)=>s.status==='PAID').length}</p>
             </div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
             <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl"><AlertCircle size={20} /></div>
             <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Piutang Aktif</p>
                <p className="text-lg font-black text-slate-800">{sales.filter((s:any)=>s.status==='UNPAID').length}</p>
             </div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
             <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Store size={20} /></div>
             <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Titik Lokasi</p>
                <p className="text-lg font-black text-slate-800">{data?.Lokasi?.length || 0}</p>
             </div>
          </div>
      </div>
    </div>
  );
};
