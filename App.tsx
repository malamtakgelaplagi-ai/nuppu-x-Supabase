
import React, { createContext, useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { ProductionBatches } from './pages/ProductionBatches';
import { BatchDetail } from './pages/BatchDetail';
import { MasterData } from './pages/MasterData';
import { Settings } from './pages/Settings';
import { FinishedGoods } from './pages/FinishedGoods';
import { POS } from './pages/POS';
import { Billing } from './pages/Billing';
import { Reports } from './pages/Reports';
import { Login } from './pages/Login';
import { Mutations } from './pages/Mutations';
import { SampleGoods } from './pages/SampleGoods';
import { db, isSupabaseConfigured } from './services/supabase';
import { RefreshCw, Cloud, AlertTriangle, CheckCircle2, AlertCircle, X, Info } from 'lucide-react';

export interface User {
  id: string;
  name: string;
  role: 'ADMIN' | 'KASIR' | 'PRODUKSI';
  location_id: string;
  status?: string;
}

interface ModalConfig {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'alert' | 'confirm' | 'success' | 'error';
  confirmLabel?: string;
  onConfirm?: () => void;
}

interface AppContextType {
  data: any;
  loading: boolean;
  currentUser: User | null;
  currentLocationId: string;
  setCurrentLocationId: (id: string) => void;
  refreshData: () => Promise<void>;
  logout: () => void;
  isConfigured: boolean;
  isOnline: boolean;
  dbStatus: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  showModal: (config: Omit<ModalConfig, 'isOpen'>) => void;
}

export const DataContext = createContext<AppContextType | null>(null);

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('nuppu_session_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState<'CONNECTED' | 'DISCONNECTED' | 'ERROR'>('DISCONNECTED');
  const [dataError, setDataError] = useState<string | null>(null);
  const [data, setData] = useState<any>({
    Produk: [], Lokasi: [], Pelanggan: [], Bahan: [], Aksesoris: [],
    Produksi: [], StokUnit: [], Mutasi: [], Penjualan: [], SetoranCabang: [],
    Pengguna: []
  });
  const [currentLocationId, setCurrentLocationId] = useState(currentUser?.location_id || 'loc-pusat');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Global Modal State
  const [modalConfig, setModalConfig] = useState<ModalConfig>({
    isOpen: false,
    title: '',
    message: '',
    type: 'alert'
  });

  const showModal = (config: Omit<ModalConfig, 'isOpen'>) => {
    setModalConfig({ ...config, isOpen: true });
  };

  useEffect(() => {
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  const refreshData = async () => {
    if (!isSupabaseConfigured()) {
      setDbStatus('ERROR');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setDataError(null);
    try {
      const results = await Promise.all([
        db.products.getAll(),
        db.locations.getAll(),
        db.customers.getAll(),
        db.materials.getAll(),
        db.accessories.getAll(),
        db.production.getAll(),
        db.inventory.getAll(),
        db.mutations.getAll(),
        db.sales.getAll(),
        db.settlements.getAll(),
        db.users.getAll()
      ]);

      const anyError = results.some(r => r.error);
      if (anyError) {
        setDbStatus('ERROR');
        setDataError("Beberapa tabel database tidak sinkron atau belum dibuat.");
      } else {
        setDbStatus('CONNECTED');
      }
      
      setData({
        Produk: results[0].data || [],
        Lokasi: results[1].data || [],
        Pelanggan: results[2].data || [],
        Bahan: results[3].data || [],
        Aksesoris: results[4].data || [],
        Produksi: results[5].data || [],
        StokUnit: results[6].data || [],
        Mutasi: results[7].data || [],
        Penjualan: results[8].data || [],
        SetoranCabang: results[9].data || [],
        Pengguna: results[10].data || []
      });
    } catch (e) {
      setDbStatus('ERROR');
      setDataError("Gagal memuat data. Periksa koneksi internet.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      refreshData();
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  const logout = () => {
    localStorage.removeItem('nuppu_session_user');
    setCurrentUser(null);
  };

  const onLoginSuccess = () => {
    const saved = localStorage.getItem('nuppu_session_user');
    if (saved) {
      const user = JSON.parse(saved);
      setCurrentUser(user);
      setCurrentLocationId(user.location_id);
    }
  };

  return (
    <DataContext.Provider value={{ 
      data, loading, currentUser, currentLocationId, 
      setCurrentLocationId, refreshData, logout, 
      isConfigured: isSupabaseConfigured(),
      isOnline,
      dbStatus,
      showModal
    }}>
      <HashRouter>
        <div className="flex bg-slate-50 min-h-screen">
          {currentUser && <Sidebar />}
          <main className="flex-1 relative overflow-x-hidden flex flex-col">
            {!currentUser ? (
              <Login onLoginSuccess={onLoginSuccess} />
            ) : (
              <>
                {dataError && (
                  <div className="bg-rose-600 text-white px-8 py-3 flex items-center justify-between sticky top-0 z-[100] shadow-lg">
                    <div className="flex items-center gap-3">
                      <AlertTriangle size={18} />
                      <p className="text-[10px] font-black uppercase tracking-widest">{dataError}</p>
                    </div>
                    <button onClick={() => refreshData()} className="px-4 py-1.5 bg-white/20 rounded-lg text-[10px] font-black uppercase">Refresh</button>
                  </div>
                )}

                <div className="flex-1">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/pos" element={<POS />} />
                    <Route path="/billing" element={<Billing />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/finished-goods" element={<FinishedGoods />} />
                    <Route path="/sample-goods" element={<SampleGoods />} />
                    <Route path="/mutations" element={<Mutations />} />
                    <Route path="/production" element={<ProductionBatches />} />
                    <Route path="/production/:id" element={<BatchDetail />} />
                    <Route path="/master" element={<MasterData />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </div>

                <div className="fixed bottom-6 right-6 flex flex-col items-end gap-3 z-50">
                   <button 
                    onClick={() => refreshData()} 
                    disabled={loading} 
                    className="p-4 rounded-2xl shadow-2xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all active:scale-90 flex items-center justify-center group"
                   >
                    {loading ? <RefreshCw size={24} className="animate-spin" /> : <Cloud size={24} />}
                   </button>
                </div>
              </>
            )}
          </main>
        </div>

        {/* Global Modal UI Component */}
        {modalConfig.isOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-8 text-center space-y-4">
                <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center ${
                  modalConfig.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 
                  modalConfig.type === 'error' ? 'bg-rose-100 text-rose-600' : 
                  modalConfig.type === 'confirm' ? 'bg-indigo-100 text-indigo-600' :
                  'bg-amber-100 text-amber-600'
                }`}>
                  {modalConfig.type === 'success' ? <CheckCircle2 size={40} /> : 
                   modalConfig.type === 'error' ? <AlertCircle size={40} /> : 
                   modalConfig.type === 'confirm' ? <Info size={40} /> :
                   <AlertTriangle size={40} />}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">{modalConfig.title}</h3>
                  <p className="text-[11px] text-slate-500 font-bold mt-2 leading-relaxed px-4 uppercase tracking-wide">{modalConfig.message}</p>
                </div>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-4">
                {modalConfig.type === 'confirm' ? (
                  <>
                    <button 
                      onClick={() => setModalConfig({ ...modalConfig, isOpen: false })} 
                      className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all"
                    >
                      Batal
                    </button>
                    <button 
                      onClick={() => {
                        setModalConfig({ ...modalConfig, isOpen: false });
                        if (modalConfig.onConfirm) modalConfig.onConfirm();
                      }} 
                      className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all"
                    >
                      {modalConfig.confirmLabel || 'Lanjutkan'}
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => setModalConfig({ ...modalConfig, isOpen: false })} 
                    className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl hover:bg-black transition-all"
                  >
                    Tutup
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </HashRouter>
    </DataContext.Provider>
  );
};

export default App;
