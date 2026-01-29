
import React, { useContext } from 'react';
import { RefreshCw, Database, ShieldCheck, Lock, HardDrive, Terminal } from 'lucide-react';
import { DataContext } from '../App';

export const Settings: React.FC = () => {
  const context = useContext(DataContext);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Pengaturan Sistem</h1>
        <p className="text-slate-500 font-medium mt-1">Konfigurasi koneksi database dan keamanan sistem.</p>
      </header>

      <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit">
        <div className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white text-indigo-600 shadow-sm flex items-center gap-2">
          <HardDrive size={14} /> Koneksi API Database
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
              <h3 className="font-black text-slate-800 flex items-center gap-3 uppercase text-xs tracking-widest">
                <Database size={20} className="text-indigo-600" /> Status Koneksi Supabase
              </h3>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 gap-4">
                 <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">SUPABASE URL</p>
                    <p className="text-xs font-mono truncate text-indigo-600">{process.env.SUPABASE_URL || 'Tidak Terkonfigurasi'}</p>
                 </div>
                 <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">ANON KEY</p>
                    <p className="text-xs font-mono truncate text-indigo-600">••••••••••••••••••••••••••••••••</p>
                 </div>
              </div>

              <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex gap-3">
                <ShieldCheck size={18} className="text-indigo-600 shrink-0 mt-0.5" />
                <p className="text-[10px] font-bold text-indigo-700 leading-relaxed uppercase">
                  Aplikasi ini terhubung secara otomatis menggunakan kredensial yang aman. Jika data tidak muncul, pastikan tabel database sudah tersedia di Supabase.
                </p>
              </div>

              <button 
                onClick={() => context?.refreshData()}
                className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3"
              >
                <RefreshCw size={20} /> Sinkronisasi Ulang Data
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-indigo-900 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-700"><ShieldCheck size={140} /></div>
            <h4 className="font-black text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
              <Lock size={16} className="text-indigo-400" /> Database Status
            </h4>
            <div className="space-y-4 text-[11px] font-medium text-indigo-100 leading-relaxed">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-indigo-300 font-bold uppercase tracking-wider text-[9px]">Provider</span>
                <span className="font-black text-white">SUPABASE DB</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-indigo-300 font-bold uppercase tracking-wider text-[9px]">Auth Mode</span>
                <span className="font-black text-white">EMAIL / PASSWORD</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-indigo-300 font-bold uppercase tracking-wider text-[9px]">Connectivity</span>
                <span className={`font-black ${context?.isOnline ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {context?.isOnline ? 'CONNECTED' : 'OFFLINE'}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] space-y-4">
            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Terminal size={14} /> Info Sistem</h5>
            <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
              Data dienkripsi secara end-to-end. Pastikan koneksi internet stabil untuk proses mutasi stok dan sinkronisasi real-time antar cabang.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
