
import React, { useContext, useState, useEffect } from 'react';
import { 
  Plus, Trash2, Edit3, Shirt, Loader2, X, 
  Package, Search, Users, Phone, MapPin, 
  ShoppingCart, Barcode, Palette, ShieldCheck, Tag, Building2, UserCircle, CheckCircle2, AlertCircle, Mail, FileText
} from 'lucide-react';
import { DataContext } from '../App';
import { db } from '../services/supabase';

type MasterTab = 'products' | 'customers' | 'locations' | 'materials' | 'accessories' | 'users';

const getGoogleDrivePreview = (url: string) => {
  if (!url) return '';
  if (!url.includes('drive.google.com') && !url.includes('docs.google.com')) return url;
  
  const idMatch = url.match(/[-\w]{25,50}/);
  if (idMatch && idMatch[0]) {
    const id = idMatch[0];
    return `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
  }
  return url;
};

export const MasterData: React.FC = () => {
  const context = useContext(DataContext);
  const [activeTab, setActiveTab] = useState<MasterTab>('products');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const [productForm, setProductForm] = useState({ name: '', barcode: '', category: 'Apparel', price_retail: '', image_url: '', stock: 0 });
  const [locForm, setLocForm] = useState({ name: '', type: 'CABANG' as 'PUSAT' | 'CABANG', address: '', consignment_margin: '' });
  const [customerForm, setCustomerForm] = useState({ name: '', phone: '', address: '', note: '', location_id: '' });
  const [materialForm, setMaterialForm] = useState({ name: '', color: '', unit: '', stock: '', price_per_unit: '' });
  const [accessoryForm, setAccessoryForm] = useState({ name: '', color: '', size: '', unit: '', stock: '', price_per_unit: '' });
  const [userForm, setUserForm] = useState({ name: '', email: '', role: 'KASIR', location_id: 'loc-pusat', status: 'PENDING' });

  if (!context) return null;
  const { data, loading, refreshData, currentUser, showModal } = context;

  const products = data?.Produk || [];
  const locations = data?.Lokasi || [];
  const customers = data?.Pelanggan || [];
  const materials = data?.Bahan || [];
  const accessories = data?.Aksesoris || [];
  const users = data?.Pengguna || [];

  const getFilteredData = () => {
    const s = searchTerm.toLowerCase();
    switch(activeTab) {
      case 'products': return products.filter((p: any) => (p.name || '').toLowerCase().includes(s) || (p.barcode || '').includes(s));
      case 'customers': return customers.filter((c: any) => (c.name || '').toLowerCase().includes(s) || (c.phone || '').includes(s));
      case 'locations': return locations.filter((l: any) => (l.name || '').toLowerCase().includes(s) || (l.address || '').toLowerCase().includes(s));
      case 'materials': return materials.filter((m: any) => (m.name || '').toLowerCase().includes(s) || (m.color || '').toLowerCase().includes(s));
      case 'accessories': return accessories.filter((a: any) => (a.name || '').toLowerCase().includes(s) || (a.size || '').toLowerCase().includes(s));
      case 'users': return users.filter((u: any) => (u.name || '').toLowerCase().includes(s) || (u.email || '').toLowerCase().includes(s));
      default: return [];
    }
  };

  const filteredData = getFilteredData();

  const startEdit = (item: any) => {
    setEditingItem(item);
    if (activeTab === 'products') {
      setProductForm({ name: item.name || '', barcode: item.barcode || '', category: item.category || 'Apparel', price_retail: String(item.price_retail || 0), image_url: item.image_url || '', stock: item.stock || 0 });
    } else if (activeTab === 'customers') {
      setCustomerForm({ name: item.name || '', phone: item.phone || '', address: item.address || '', note: item.note || '', location_id: item.location_id || locations[0]?.id || '' });
    } else if (activeTab === 'locations') {
      setLocForm({ name: item.name || '', type: item.type || 'CABANG', address: item.address || '', consignment_margin: String(item.consignment_margin || 0) });
    } else if (activeTab === 'materials') {
      setMaterialForm({ name: item.name || '', color: item.color || '', unit: item.unit || '', stock: String(item.stock || ''), price_per_unit: String(item.price_per_unit || '') });
    } else if (activeTab === 'accessories') {
      setAccessoryForm({ name: item.name || '', color: item.color || '', size: item.size || '', unit: item.unit || '', stock: String(item.stock || ''), price_per_unit: String(item.price_per_unit || '') });
    } else if (activeTab === 'users') {
      setUserForm({ name: item.name || '', email: item.email || '', role: item.role || 'KASIR', location_id: item.location_id || 'loc-pusat', status: item.status || 'PENDING' });
    }
    setIsModalOpen(true);
  };

  const startAdd = () => {
    if (activeTab === 'users') {
      showModal({ title: 'Akses Dibatasi', message: 'User baru harus mendaftar melalui halaman Registrasi.', type: 'alert' });
      return;
    }
    setEditingItem(null);
    const defaultLoc = currentUser?.location_id || locations[0]?.id || 'loc-pusat';
    setProductForm({ name: '', barcode: '', category: 'Apparel', price_retail: '', image_url: '', stock: 0 });
    setCustomerForm({ name: '', phone: '', address: '', note: '', location_id: defaultLoc });
    setLocForm({ name: '', type: 'CABANG', address: '', consignment_margin: '0' });
    setMaterialForm({ name: '', color: '', unit: '', stock: '', price_per_unit: '' });
    setAccessoryForm({ name: '', color: '', size: '', unit: '', stock: '', price_per_unit: '' });
    setIsModalOpen(true);
  };

  const executeDeleteAction = async (id: string) => {
    setIsSubmitting(true);
    let result;
    try {
      if (activeTab === 'products') result = await db.products.delete(id);
      else if (activeTab === 'customers') result = await db.customers.delete(id);
      else if (activeTab === 'locations') result = await db.locations.delete(id);
      else if (activeTab === 'materials') result = await db.materials.delete(id);
      else if (activeTab === 'accessories') result = await db.accessories.delete(id);

      if (result && !result.error) {
        await refreshData();
        showModal({ title: 'Berhasil', message: 'Data telah dihapus.', type: 'success' });
      } else {
        showModal({ title: 'Gagal', message: result?.error?.message || 'Gagal menghapus.', type: 'error' });
      }
    } catch (err: any) {
      showModal({ title: 'Error', message: err.message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    showModal({
      title: 'Hapus Data',
      message: `Yakin ingin menghapus "${name}"? Tindakan ini tidak dapat dibatalkan.`,
      type: 'confirm',
      confirmLabel: 'Hapus Sekarang',
      onConfirm: () => executeDeleteAction(id)
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const generatedId = editingItem ? editingItem.id : crypto.randomUUID();
    let result;

    try {
      if (activeTab === 'products') {
        result = await db.products.upsert({ id: generatedId, name: productForm.name, barcode: productForm.barcode, category: productForm.category, price_retail: Number(productForm.price_retail) || 0, image_url: getGoogleDrivePreview(productForm.image_url), stock: Number(productForm.stock) || 0 });
      } else if (activeTab === 'customers') {
        result = await db.customers.upsert({ id: generatedId, name: customerForm.name.trim(), phone: customerForm.phone.trim(), address: customerForm.address.trim(), note: customerForm.note.trim(), location_id: customerForm.location_id });
      } else if (activeTab === 'locations') {
        result = await db.locations.upsert({ id: editingItem ? editingItem.id : (locForm.type === 'PUSAT' ? 'loc-pusat' : generatedId), name: locForm.name, type: locForm.type, address: locForm.address, consignment_margin: Number(locForm.consignment_margin) || 0 });
      } else if (activeTab === 'materials') {
        result = await db.materials.upsert({ id: generatedId, name: materialForm.name, color: materialForm.color, unit: materialForm.unit, stock: Number(materialForm.stock) || 0, price_per_unit: Number(materialForm.price_per_unit) || 0 });
      } else if (activeTab === 'accessories') {
        result = await db.accessories.upsert({ id: generatedId, name: accessoryForm.name, color: accessoryForm.color, size: accessoryForm.size, unit: accessoryForm.unit, stock: Number(accessoryForm.stock) || 0, price_per_unit: Number(accessoryForm.price_per_unit) || 0 });
      } else if (activeTab === 'users' && editingItem) {
        result = await db.users.update(editingItem.id, userForm);
      }

      if (result && !result.error) {
        await refreshData();
        setIsModalOpen(false);
      } else {
        showModal({ title: 'Gagal Simpan', message: result?.error?.message || 'Terjadi kesalahan.', type: 'error' });
      }
    } catch (err: any) {
      showModal({ title: 'Error', message: err.message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTabIcon = (tab: MasterTab) => {
    switch(tab) {
      case 'products': return <Shirt size={18} />;
      case 'customers': return <Users size={18} />;
      case 'locations': return <MapPin size={18} />;
      case 'materials': return <Package size={18} />;
      case 'accessories': return <ShoppingCart size={18} />;
      case 'users': return <ShieldCheck size={18} />;
    }
  };

  const getTabTitle = (tab: MasterTab) => {
    switch(tab) {
      case 'products': return "Produk / Model";
      case 'customers': return "Customer";
      case 'locations': return "Gudang & Cabang";
      case 'materials': return "Bahan Baku";
      case 'accessories': return "Aksesoris";
      case 'users': return "Pengguna / Akun";
    }
  };

  const getTabColor = (tab: MasterTab) => {
    switch(tab) {
      case 'products': return "text-indigo-600 bg-indigo-50";
      case 'customers': return "text-emerald-600 bg-emerald-50";
      case 'locations': return "text-rose-600 bg-rose-50";
      case 'materials': return "text-amber-600 bg-amber-50";
      case 'accessories': return "text-cyan-600 bg-cyan-50";
      case 'users': return "text-slate-700 bg-slate-100";
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Master Data</h1>
          <p className="text-slate-500 font-medium">Pusat pengaturan data inti sistem konveksi Anda.</p>
        </div>
        <button onClick={startAdd} className="bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-3">
          <Plus size={20} /> Tambah {getTabTitle(activeTab)}
        </button>
      </header>

      <div className="flex flex-wrap gap-2 bg-slate-100 p-2 rounded-[2rem] w-fit shadow-inner border border-slate-200/50">
        {(['products', 'customers', 'locations', 'materials', 'accessories', 'users'] as MasterTab[]).map(tab => (
          <button key={tab} onClick={() => { setActiveTab(tab); setSearchTerm(''); }} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === tab ? 'bg-white text-indigo-600 shadow-md scale-105' : 'text-slate-500 hover:text-slate-700'}`}>
            {getTabIcon(tab)} {getTabTitle(tab)}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col min-h-[600px] relative">
        {loading && <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-20 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>}
        <div className="p-6 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between gap-4">
           <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" placeholder={`Cari di ${getTabTitle(activeTab)}...`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
           </div>
           <div className={`px-4 py-2 rounded-xl border border-slate-100 flex items-center gap-2 ${getTabColor(activeTab)}`}>
              {getTabIcon(activeTab)}
              <span className="text-[10px] font-black uppercase tracking-widest">{getTabTitle(activeTab)}</span>
           </div>
        </div>

        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 bg-slate-50/10">
                <th className="px-8 py-5">Identitas</th>
                <th className="px-8 py-5">Kontak / Keterangan</th>
                <th className="px-8 py-5">Status / Cabang / Harga</th>
                <th className="px-8 py-5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredData.map((item: any) => (
                <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-[1.25rem] flex items-center justify-center border border-white shadow-sm overflow-hidden ${getTabColor(activeTab)}`}>
                        {activeTab === 'products' && (item.image_url || item.imageUrl) ? <img src={item.image_url || item.imageUrl} className="w-full h-full object-cover" /> : getTabIcon(activeTab)}
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 text-sm mb-0.5">{item.name || 'N/A'}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[120px]">{item.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    {activeTab === 'users' && (
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-700 flex items-center gap-2"><Mail size={12} className="text-indigo-400" /> {item.email || '-'}</p>
                        <p className="text-[10px] font-bold text-slate-400 flex items-center gap-2"><Building2 size={10} /> {locations.find((l:any) => l.id === item.location_id)?.name || 'Pusat'}</p>
                      </div>
                    )}
                    {activeTab === 'customers' && (
                       <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5"><Phone size={12} className="text-emerald-500" /> {item.phone || 'N/A'}</p>
                          <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5"><Building2 size={10} className="text-slate-300" /> {locations.find((l:any) => l.id === item.location_id)?.name || 'Umum'}</p>
                       </div>
                    )}
                    {activeTab === 'locations' && <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5"><MapPin size={12} className="text-rose-500" /> {item.address || 'Alamat belum diisi'}</p>}
                    {activeTab === 'products' && (
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-600">{item.category}</p>
                        <div className="flex items-center gap-1.5 text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase w-fit"><Barcode size={10} /> {item.barcode || 'N/A'}</div>
                      </div>
                    )}
                    {(activeTab === 'materials' || activeTab === 'accessories') && <p className="text-xs font-bold text-slate-600">{item.color || '-'}</p>}
                  </td>
                  <td className="px-8 py-6">
                    {activeTab === 'users' ? (
                        <div className="flex flex-col gap-2">
                           <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border flex items-center gap-1.5 w-fit ${item.status === 'AKTIF' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                              {item.status === 'AKTIF' ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />} {item.status || 'PENDING'}
                           </div>
                           <p className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg w-fit uppercase">{item.role || 'KASIR'}</p>
                        </div>
                    ) : (
                      <span className="text-sm font-black text-slate-900">
                        {activeTab === 'products' ? `Rp ${Number(item.price_retail || item.price || 0).toLocaleString()}` : 
                         activeTab === 'locations' ? `${item.consignment_margin || 0}% Margin` :
                         item.stock !== undefined ? `${item.stock} ${item.unit || ''}` : '-'}
                      </span>
                    )}
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(item)} className="p-2.5 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Edit3 size={18} /></button>
                      <button onClick={() => handleDelete(item.id, item.name)} className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={() => !isSubmitting && setIsModalOpen(false)}></div>
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
             <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-xl font-black text-slate-900">{editingItem ? 'Edit' : 'Tambah'} {getTabTitle(activeTab)}</h2>
                <button onClick={() => !isSubmitting && setIsModalOpen(false)} className="text-slate-400"><X size={24} /></button>
             </div>
             <form onSubmit={handleSave} className="p-8 space-y-6 overflow-y-auto">
                {activeTab === 'products' && (
                  <div className="space-y-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Model</label>
                      <input required value={productForm.name} onChange={(e) => setProductForm({...productForm, name: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Barcode/SKU</label>
                        <input value={productForm.barcode} onChange={(e) => setProductForm({...productForm, barcode: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Harga Retail (Rp)</label>
                        <input required type="number" value={productForm.price_retail} onChange={(e) => setProductForm({...productForm, price_retail: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">URL Foto Produk</label>
                      <input value={productForm.image_url} onChange={(e) => setProductForm({...productForm, image_url: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs" />
                    </div>
                  </div>
                )}
                {activeTab === 'customers' && (
                  <div className="space-y-6">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Pelanggan</label>
                       <input required value={customerForm.name} onChange={(e) => setCustomerForm({...customerForm, name: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No. WhatsApp</label>
                        <input required value={customerForm.phone} onChange={(e) => setCustomerForm({...customerForm, phone: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Asal Cabang</label>
                        <select required value={customerForm.location_id} onChange={(e) => setCustomerForm({...customerForm, location_id: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm">
                           <option value="">-- Pilih Lokasi --</option>
                           {locations.map((l:any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alamat</label>
                        <textarea value={customerForm.address} onChange={(e) => setCustomerForm({...customerForm, address: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm h-24" />
                    </div>
                  </div>
                )}
                {activeTab === 'locations' && (
                  <div className="space-y-6">
                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Lokasi</label>
                        <input required value={locForm.name} onChange={(e) => setLocForm({...locForm, name: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipe</label>
                            <select value={locForm.type} onChange={(e) => setLocForm({...locForm, type: e.target.value as any})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm">
                                <option value="CABANG">CABANG</option><option value="PUSAT">PUSAT</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Margin (%)</label>
                           <input type="number" value={locForm.consignment_margin} onChange={(e) => setLocForm({...locForm, consignment_margin: e.target.value})} className="w-full px-5 py-3.5 bg-rose-50 border border-rose-100 rounded-2xl font-bold text-sm" />
                        </div>
                     </div>
                  </div>
                )}
                {(activeTab === 'materials' || activeTab === 'accessories') && (
                  <div className="space-y-6">
                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Barang</label>
                        <input required value={activeTab === 'materials' ? materialForm.name : accessoryForm.name} onChange={(e) => activeTab === 'materials' ? setMaterialForm({...materialForm, name: e.target.value}) : setAccessoryForm({...accessoryForm, name: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Warna</label>
                           <input value={activeTab === 'materials' ? materialForm.color : accessoryForm.color} onChange={(e) => activeTab === 'materials' ? setMaterialForm({...materialForm, color: e.target.value}) : setAccessoryForm({...accessoryForm, color: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Satuan</label>
                           <input required value={activeTab === 'materials' ? materialForm.unit : accessoryForm.unit} onChange={(e) => activeTab === 'materials' ? setMaterialForm({...materialForm, unit: e.target.value}) : setAccessoryForm({...accessoryForm, unit: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" />
                        </div>
                     </div>
                  </div>
                )}
                <div className="pt-6 border-t border-slate-100 flex gap-4">
                   <button type="button" disabled={isSubmitting} onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl uppercase tracking-widest text-[10px]">Batal</button>
                   <button type="submit" disabled={isSubmitting} className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-[10px]">{isSubmitting ? <Loader2 className="animate-spin" size={18} /> : (editingItem ? 'Simpan' : 'Tambah')}</button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};
