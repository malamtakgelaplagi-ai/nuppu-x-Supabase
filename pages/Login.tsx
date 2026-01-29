
import React, { useState, useEffect } from 'react';
import { Shirt, Lock, User, Loader2, AlertCircle, Eye, EyeOff, CheckCircle2, UserPlus, ArrowLeft, MapPin } from 'lucide-react';
import { db } from '../services/supabase';

interface LoginProps {
  onLoginSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'KASIR' | 'PRODUKSI'>('KASIR');
  const [locationId, setLocationId] = useState('loc-pusat');
  const [locations, setLocations] = useState<any[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch locations for registration dropdown
  useEffect(() => {
    const fetchLocs = async () => {
      const { data } = await db.locations.getAll();
      if (data) setLocations(data);
    };
    fetchLocs();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { data: profile, error: loginError } = await db.users.loginManual(email.trim(), password.trim());

      if (loginError || !profile) {
        setError('Email atau Password salah, atau akun belum terdaftar.');
        setIsLoading(false);
        return;
      }

      if (profile.status === 'PENDING') {
        setError(`Akun Anda (${email}) masih PENDING. Hubungi Admin untuk aktivasi.`);
        setIsLoading(false);
        return;
      }

      const userSession = {
        id: profile.id,
        name: profile.name,
        role: profile.role,
        location_id: profile.location_id || 'loc-pusat',
        status: profile.status
      };
      localStorage.setItem('nuppu_session_user', JSON.stringify(userSession));
      
      onLoginSuccess();
    } catch (err) {
      setError('Terjadi kesalahan sistem saat login.');
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const { error: dbError } = await db.users.create({
        id: crypto.randomUUID(),
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
        role: role,
        status: 'PENDING',
        location_id: locationId
      });

      if (dbError) {
        setError('Gagal mendaftar. Email mungkin sudah terdaftar atau tabel database bermasalah.');
      } else {
        setSuccessMsg('Pendaftaran Berhasil! Akun Anda sedang menunggu persetujuan Admin.');
        setIsRegistering(false);
        setEmail('');
        setPassword('');
        setName('');
      }
    } catch (err) {
      setError('Gagal melakukan registrasi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-100 via-slate-50 to-white">
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-8">
          <div className="inline-flex p-4 bg-indigo-600 text-white rounded-[2rem] shadow-2xl shadow-indigo-200 mb-6">
            <Shirt size={48} strokeWidth={2.5} />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">NUPPU PRO</h1>
          <p className="text-slate-500 font-medium mt-2 uppercase tracking-widest text-[10px]">Sistem Manajemen Produksi Konveksi</p>
        </div>

        <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-2xl border border-slate-100 relative overflow-hidden">
          <div className={`absolute top-0 left-0 w-full h-2 ${isRegistering ? 'bg-emerald-500' : 'bg-indigo-600'}`}></div>
          
          {successMsg && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top duration-300">
              <CheckCircle2 className="text-emerald-500 shrink-0" size={20} />
              <p className="text-xs font-bold text-emerald-700 leading-relaxed">{successMsg}</p>
            </div>
          )}

          <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-black text-slate-800">{isRegistering ? 'Daftar Akun' : 'Masuk Sistem'}</h2>
              {isRegistering && (
                <button type="button" onClick={() => setIsRegistering(false)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 hover:text-indigo-600 transition-colors">
                  <ArrowLeft size={12} /> Kembali
                </button>
              )}
            </div>

            {isRegistering && (
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Nama Lengkap</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input required type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 transition-all" placeholder="Nama..." />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Email</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:ring-2 transition-all focus:ring-indigo-500" placeholder="email@nuppu.com" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input required type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:ring-2 transition-all focus:ring-indigo-500" placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {isRegistering && (
              <>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Lokasi Penempatan</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <select 
                      required 
                      value={locationId} 
                      onChange={(e) => setLocationId(e.target.value)} 
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
                    >
                      {locations.map((loc: any) => (
                        <option key={loc.id} value={loc.id}>{loc.name} {loc.id === 'loc-pusat' ? '(Pusat)' : ''}</option>
                      ))}
                      {locations.length === 0 && <option value="loc-pusat">Gudang Pusat</option>}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Role Pekerjaan</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setRole('KASIR')} className={`py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${role === 'KASIR' ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>Kasir</button>
                    <button type="button" onClick={() => setRole('PRODUKSI')} className={`py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${role === 'PRODUKSI' ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>Produksi</button>
                  </div>
                </div>
              </>
            )}

            {error && (
              <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 flex items-start gap-2">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <p className="text-[10px] font-bold leading-relaxed">{error}</p>
              </div>
            )}

            <button type="submit" disabled={isLoading} className={`w-full py-5 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95 ${isRegistering ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : (isRegistering ? "Daftar Sekarang" : "Masuk")}
            </button>

            {!isRegistering && (
              <button type="button" onClick={() => setIsRegistering(true)} className="w-full py-3 text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-indigo-600 transition-colors flex items-center justify-center gap-2">
                <UserPlus size={14} /> Belum Punya Akun? Daftar
              </button>
            )}
          </form>
        </div>
        <p className="text-center mt-8 text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em]">Manual Database Authentication</p>
      </div>
    </div>
  );
};
