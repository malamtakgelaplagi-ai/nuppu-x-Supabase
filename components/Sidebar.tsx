
import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { NAV_ITEMS } from '../constants';
import { Menu, X, Shirt, MapPin, ChevronDown, LogOut, DatabaseZap, ShieldAlert } from 'lucide-react';
import { DataContext } from '../App';

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const context = useContext(DataContext);
  const [isOpen, setIsOpen] = React.useState(true);
  const [showLocMenu, setShowLocMenu] = React.useState(false);

  if (!context) return null;
  const { currentLocationId, setCurrentLocationId, data, currentUser, logout, dbStatus } = context;
  
  // Jika tidak ada user, jangan tampilkan sidebar (untuk halaman login)
  if (!currentUser) return null;

  const locations = data?.Lokasi || [];
  const activeLoc = locations.find((l: any) => l.id === currentLocationId) || locations[0];

  // Pastikan filter nav item bekerja dengan benar sesuai role
  const filteredNav = NAV_ITEMS.filter(item => {
    const role = currentUser.role;
    if (role === 'ADMIN') return true;
    if (role === 'KASIR') {
      return ['pos', 'reports', 'finished-goods', 'billing'].includes(item.id);
    }
    if (role === 'PRODUKSI') {
      return ['dashboard', 'production', 'finished-goods', 'sample-goods', 'master'].includes(item.id);
    }
    return false;
  });

  const canSwitchLocation = currentUser.role === 'ADMIN';

  return (
    <div className={`${isOpen ? 'w-64' : 'w-20'} h-screen bg-indigo-950 text-white flex flex-col transition-all duration-300 ease-in-out sticky top-0 z-[100] border-r border-white/5 shadow-2xl shrink-0`}>
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white p-1.5 rounded-lg text-indigo-900 shadow-xl shrink-0">
            <Shirt size={24} strokeWidth={2.5} />
          </div>
          {isOpen && <span className="font-black text-xl tracking-tighter">NUPPU</span>}
        </div>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 hover:bg-white/10 rounded-md transition-colors"
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {isOpen && (
        <div className="px-6 mb-4">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white font-black shadow-inner shrink-0 uppercase">
              {currentUser.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black truncate">{currentUser.name}</p>
              <p className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest">{currentUser.role}</p>
            </div>
          </div>
        </div>
      )}

      {isOpen && (
        <div className="px-6 mb-4">
           <div className={`flex items-center gap-3 p-2 px-3 rounded-xl border ${dbStatus === 'CONNECTED' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'} transition-colors`}>
              {dbStatus === 'CONNECTED' ? <DatabaseZap size={14} /> : <ShieldAlert size={14} className="animate-pulse" />}
              <span className="text-[9px] font-black uppercase tracking-[0.1em] truncate">
                DB: {dbStatus === 'CONNECTED' ? 'ONLINE' : 'ERROR'}
              </span>
           </div>
        </div>
      )}

      {isOpen && canSwitchLocation && (
        <div className="px-4 mb-4 relative">
          <button 
            onClick={() => setShowLocMenu(!showLocMenu)}
            className="w-full flex items-center gap-3 p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all group"
          >
            <MapPin size={18} className="text-indigo-300 shrink-0" />
            <div className="flex-1 text-left min-w-0">
              <p className="text-[9px] font-black text-indigo-300 uppercase leading-none mb-1">Lokasi Aktif</p>
              <p className="text-xs font-bold truncate">{activeLoc?.name || 'Pusat'}</p>
            </div>
            <ChevronDown size={14} className={`transition-transform ${showLocMenu ? 'rotate-180' : ''}`} />
          </button>
          
          {showLocMenu && (
            <div className="absolute left-4 right-4 top-full mt-2 bg-white rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-[110]">
              {locations.map((loc: any) => (
                <button
                  key={loc.id}
                  onClick={() => {
                    setCurrentLocationId(loc.id);
                    setShowLocMenu(false);
                  }}
                  className={`w-full text-left p-3 text-xs font-bold border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors ${currentLocationId === loc.id ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600'}`}
                >
                  {loc.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <nav className="flex-1 mt-2 px-4 space-y-1 overflow-y-auto">
        {filteredNav.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.id}
              to={item.path}
              className={`flex items-center gap-4 p-3 rounded-xl transition-all ${
                isActive 
                  ? 'bg-white text-indigo-900 shadow-lg' 
                  : 'hover:bg-indigo-900 text-indigo-100'
              }`}
            >
              <div className={isActive ? 'text-indigo-900' : 'text-indigo-300'}>
                {item.icon}
              </div>
              {isOpen && <span className="font-bold text-sm whitespace-nowrap">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/5">
        <button 
          onClick={logout}
          className="w-full flex items-center gap-4 p-3 text-rose-300 hover:bg-rose-500 hover:text-white rounded-xl transition-all font-bold"
        >
          <LogOut size={20} />
          {isOpen && <span className="text-sm">Keluar Sistem</span>}
        </button>
      </div>
    </div>
  );
};
