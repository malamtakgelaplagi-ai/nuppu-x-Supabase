
import React, { useContext, useState, useMemo, useEffect } from 'react';
import { DataContext } from '../App';
import { 
  ReceiptText, Wallet, User, DollarSign, 
  History, Building2, ShoppingCart, ArrowUpRight,
  Filter, CheckCircle2, ChevronRight
} from 'lucide-react';
import { CustomerReceivables } from './CustomerReceivables';
import { ConsignmentBilling } from './ConsignmentBilling';

type BillingTab = 'customer' | 'consignment';

export const Billing: React.FC = () => {
  const context = useContext(DataContext);
  const [activeTab, setActiveTab] = useState<BillingTab>('customer');

  if (!context) return null;
  const { data, currentUser } = context;

  const isKasir = currentUser?.role === 'KASIR';

  useEffect(() => {
    if (isKasir) {
      setActiveTab('customer');
    }
  }, [isKasir]);

  const sales = data?.Penjualan || [];

  const totalCustomerReceivables = useMemo(() => {
    const baseSales = isKasir && currentUser ? sales.filter((s: any) => s.location_id === currentUser.location_id) : sales;
    return baseSales.reduce((sum: number, s: any) => sum + (Number(s.remaining_amount) || 0), 0);
  }, [sales, isKasir, currentUser]);

  const totalConsignmentDebt = useMemo(() => {
    // Tagihan Konsinyasi dihitung dari SEMUA nota yang bertipe KONSINYASI (tanda belum setor ke pusat)
    return sales
      .filter((s: any) => s.type === 'KONSINYASI')
      .reduce((sum: number, s: any) => sum + (Number(s.total_consignment || s.total_price) || 0), 0);
  }, [sales]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <ReceiptText className="text-indigo-600" />
            {isKasir ? 'Piutang & Tagihan' : 'Manajemen Keuangan Cabang'}
          </h1>
          <p className="text-slate-500 font-medium">
            {isKasir 
              ? 'Pantau sisa pembayaran dari pelanggan di cabang Anda.' 
              : 'Pantau piutang retail dan kewajiban setoran dari seluruh cabang.'}
          </p>
        </div>
      </header>

      <div className={`grid grid-cols-1 ${isKasir ? 'md:grid-cols-1 max-w-md' : 'md:grid-cols-2'} gap-6`}>
        <div 
          onClick={() => setActiveTab('customer')}
          className={`p-8 rounded-[2.5rem] border transition-all flex items-center gap-6 shadow-sm ${activeTab === 'customer' ? 'bg-indigo-600 border-indigo-500 text-white shadow-xl shadow-indigo-100' : 'bg-white border-slate-100 hover:border-indigo-200'} ${isKasir ? 'cursor-default' : 'cursor-pointer'}`}
        >
          <div className={`p-5 rounded-2xl ${activeTab === 'customer' ? 'bg-white/20' : 'bg-indigo-50 text-indigo-600'}`}>
            <Wallet size={32} />
          </div>
          <div>
            <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${activeTab === 'customer' ? 'text-indigo-100' : 'text-slate-400'}`}>Piutang Customer (Retail)</p>
            <h3 className="text-2xl font-black">Rp {totalCustomerReceivables.toLocaleString()}</h3>
            {!isKasir && activeTab === 'customer' && <div className="mt-2 flex items-center gap-1 text-[10px] font-bold"><CheckCircle2 size={12} /> Menampilkan Detail</div>}
          </div>
        </div>

        {!isKasir && (
          <div 
            onClick={() => setActiveTab('consignment')}
            className={`cursor-pointer p-8 rounded-[2.5rem] border transition-all flex items-center gap-6 shadow-sm ${activeTab === 'consignment' ? 'bg-rose-600 border-rose-500 text-white shadow-xl shadow-rose-100' : 'bg-white border-slate-100 hover:border-indigo-200'}`}
          >
            <div className={`p-5 rounded-2xl ${activeTab === 'consignment' ? 'bg-white/20' : 'bg-rose-50 text-rose-600'}`}>
              <Building2 size={32} />
            </div>
            <div>
              <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${activeTab === 'consignment' ? 'text-rose-100' : 'text-slate-400'}`}>Total Tagihan Cabang</p>
              <h3 className="text-2xl font-black">Rp {totalConsignmentDebt.toLocaleString()}</h3>
              {activeTab === 'consignment' && <div className="mt-2 flex items-center gap-1 text-[10px] font-bold"><CheckCircle2 size={12} /> Menampilkan Detail</div>}
            </div>
          </div>
        )}
      </div>

      {!isKasir && (
        <div className="flex bg-slate-200/50 p-1.5 rounded-[1.8rem] w-full md:w-fit shadow-inner border border-slate-200/50">
          <button 
            onClick={() => setActiveTab('customer')}
            className={`flex-1 md:flex-none px-10 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'customer' ? 'bg-white text-indigo-600 shadow-md scale-105' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <User size={16} /> Piutang Customer
          </button>
          <button 
            onClick={() => setActiveTab('consignment')}
            className={`flex-1 md:flex-none px-10 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'consignment' ? 'bg-white text-rose-600 shadow-md scale-105' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Building2 size={16} /> Tagihan Cabang
          </button>
        </div>
      )}

      <div className="animate-in slide-in-from-bottom-4 duration-300">
        {activeTab === 'customer' ? (
          <div className="space-y-4">
             <div className="flex items-center gap-2 px-2 text-indigo-600">
               <div className="w-1 h-4 bg-indigo-600 rounded-full"></div>
               <span className="text-xs font-black uppercase tracking-widest">Detail Sisa Pembayaran Customer</span>
             </div>
             <CustomerReceivables isNested />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-2 text-rose-600">
               <div className="w-1 h-4 bg-rose-600 rounded-full"></div>
               <span className="text-xs font-black uppercase tracking-widest">Detail Nota Belum Disetor Oleh Cabang</span>
            </div>
             <ConsignmentBilling isNested />
          </div>
        )}
      </div>
    </div>
  );
};
