
import React, { useContext, useState, useMemo, useEffect } from 'react';
import { DataContext } from '../App';
import { 
  Box, Search, Filter, ArrowUpRight, ArrowDownLeft, 
  Shirt, Tag, Package, Clock, AlertTriangle, CheckCircle2,
  TrendingUp, Layers, Archive, Scale, MapPin, ChevronDown, Home, List, Image as ImageIcon, Palette, X, ZoomIn, Building2, Barcode, Info, DollarSign,
  ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SizeTarget } from '../types';

export const FinishedGoods: React.FC = () => {
  const context = useContext(DataContext);
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductDetail, setSelectedProductDetail] = useState<any>(null);

  if (!context) return null;
  const { data, loading, currentUser } = context;

  const isAdmin = currentUser?.role === 'ADMIN';
  const initialLocId = isAdmin ? 'all' : (currentUser?.location_id || 'loc-pusat');
  const [selectedLocationId, setSelectedLocationId] = useState<string>(initialLocId);

  useEffect(() => {
    if (!isAdmin && currentUser) {
      setSelectedLocationId(currentUser.location_id);
    }
  }, [currentUser, isAdmin]);

  const products = data?.Produk || [];
  const locations = data?.Lokasi || [];
  const stockUnits = data?.StokUnit || [];

  const getProductColorSizeStock = (productId: string, locationId: string) => {
    const colorSizeMap: Record<string, Record<string, number>> = {};

    const filteredStock = stockUnits.filter((s: any) => {
      const matchProduct = String(s.product_id) === String(productId);
      const matchLocation = locationId === 'all' || String(s.location_id) === String(locationId);
      return matchProduct && matchLocation;
    });

    filteredStock.forEach((s: any) => {
      const color = s.color || 'Umum';
      const size = s.size || 'N/A';
      const qty = Number(s.qty) || 0;

      if (!colorSizeMap[color]) colorSizeMap[color] = {};
      colorSizeMap[color][size] = (colorSizeMap[color][size] || 0) + qty;
    });

    return colorSizeMap;
  };

  const getProductTotalStock = (productId: string) => {
    const colorStock = getProductColorSizeStock(productId, selectedLocationId);
    let total = 0;
    Object.values(colorStock).forEach(sizes => {
      Object.values(sizes).forEach(qty => {
        total += qty;
      });
    });
    return total;
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p: any) => {
      return p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
             (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase()));
    });
  }, [products, searchTerm]);

  const totalStockAll = products.reduce((sum: number, p: any) => sum + getProductTotalStock(p.id), 0);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Gudang Jadi</h1>
          <p className="text-slate-500 font-medium">Monitoring produk siap jual & rincian varian.</p>
        </div>
        <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-5">
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl"><Package size={28} /></div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1.5">Total Stok ({selectedLocationId === 'all' ? 'Semua' : 'Lokasi Ini'})</p>
            <p className="text-2xl font-black text-slate-900">{totalStockAll.toLocaleString()} <span className="text-sm text-slate-400 uppercase">PCS</span></p>
          </div>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Cari Nama Produk atau ID / SKU..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm" 
          />
        </div>
        
        {isAdmin && (
          <div className="relative w-full md:w-72">
            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-600" size={20} />
            <select 
              value={selectedLocationId} 
              onChange={(e) => setSelectedLocationId(e.target.value)} 
              className="w-full pl-12 pr-10 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm font-black text-xs uppercase tracking-widest outline-none appearance-none cursor-pointer"
            >
              <option value="all">Semua Lokasi</option>
              {locations.map((loc: any) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={16} />
          </div>
        )}
        
        {!isAdmin && (
          <div className="flex items-center gap-3 px-6 py-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
             <MapPin size={18} className="text-indigo-600" />
             <div>
                <p className="text-[8px] font-black text-indigo-300 uppercase leading-none mb-1">Lokasi Anda</p>
                <p className="text-xs font-black text-indigo-900 uppercase">{locations.find(l => l.id === selectedLocationId)?.name || 'Pusat'}</p>
             </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map((product: any) => {
           const colorStock = getProductColorSizeStock(product.id, selectedLocationId);
           const stock = Object.values(colorStock).reduce((acc, sizes) => acc + Object.values(sizes).reduce((a, b) => a + b, 0), 0);
           
           if (stock <= 0 && !searchTerm) return null;

           const availableColors = Object.entries(colorStock)
             .filter(([_, sizes]) => Object.values(sizes).some(qty => qty > 0))
             .map(([color]) => color);

           const availableSizesSet = new Set<string>();
           Object.values(colorStock).forEach(sizes => {
             Object.entries(sizes).forEach(([size, qty]) => {
               if (qty > 0) availableSizesSet.add(size);
             });
           });
           const availableSizes = Array.from(availableSizesSet).sort();
           
           return (
             <div 
               key={product.id} 
               onClick={() => setSelectedProductDetail(product)}
               className="group bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all cursor-pointer relative overflow-hidden flex flex-col"
             >
                <div className="aspect-square bg-slate-50 rounded-[2rem] mb-5 overflow-hidden border border-slate-50 relative">
                   {product.image_url ? (
                     <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                   ) : (
                     <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-50">
                        <ImageIcon size={48} strokeWidth={1} />
                        <span className="text-[9px] font-black uppercase mt-2">No Image</span>
                     </div>
                   )}
                   <div className="absolute top-3 right-3 px-3 py-1 bg-white/90 backdrop-blur rounded-full text-[9px] font-black text-indigo-600 shadow-sm uppercase tracking-widest">
                     {product.category || 'General'}
                   </div>
                </div>
                
                <div className="flex justify-between items-start gap-2 mb-2">
                  <h3 className="text-sm font-black text-slate-800 line-clamp-2 flex-1">{product.name}</h3>
                  <p className="text-xs font-black text-indigo-600 whitespace-nowrap">Rp {Number(product.price_retail || 0).toLocaleString()}</p>
                </div>
                
                <div className="flex items-center gap-1.5 mb-4">
                   <Barcode size={12} className="text-slate-300" />
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{product.barcode || 'NO-SKU'}</span>
                </div>

                <div className="space-y-3 mb-6">
                   <div className="flex flex-wrap gap-1.5">
                      {availableColors.length > 0 ? availableColors.map(c => (
                        <span key={c} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[8px] font-black uppercase rounded-lg border border-indigo-100/50 flex items-center gap-1">
                          <Palette size={8} /> {c}
                        </span>
                      )) : <span className="text-[8px] text-slate-300 italic font-bold">No Color Data</span>}
                   </div>
                   <div className="flex flex-wrap gap-1">
                      {availableSizes.length > 0 ? availableSizes.map(s => (
                        <span key={s} className="w-6 h-6 flex items-center justify-center bg-slate-50 text-slate-600 text-[8px] font-black uppercase rounded-md border border-slate-100">
                          {s}
                        </span>
                      )) : <span className="text-[8px] text-slate-300 italic font-bold">No Size Data</span>}
                   </div>
                </div>

                <div className="mt-auto pt-5 border-t border-slate-50 flex justify-between items-end">
                   <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Stok Tersedia</p>
                      <p className={`text-xl font-black ${stock > 0 ? 'text-indigo-600' : 'text-rose-400'}`}>
                        {stock} <span className="text-[10px] text-indigo-300">PCS</span>
                      </p>
                   </div>
                   <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <ChevronRight size={18} />
                   </div>
                </div>
             </div>
           );
        })}
      </div>

      {filteredProducts.length === 0 && !loading && (
        <div className="py-32 flex flex-col items-center justify-center text-slate-300 bg-white rounded-[3rem] border border-dashed border-slate-100">
           <Archive size={64} strokeWidth={1} className="mb-4 opacity-20" />
           <p className="font-black text-xs uppercase tracking-[0.3em]">Tidak ada produk ditemukan</p>
        </div>
      )}

      {selectedProductDetail && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setSelectedProductDetail(null)}></div>
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-4xl max-h-[90vh] relative z-10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg"><Info size={24} /></div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">Detail Gudang Jadi</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Rincian persediaan fisik per varian</p>
                </div>
              </div>
              <button onClick={() => setSelectedProductDetail(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-10">
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="space-y-8">
                     <div className="aspect-square bg-slate-100 rounded-[3rem] overflow-hidden border border-slate-100 shadow-inner group relative">
                        {selectedProductDetail.image_url ? (
                          <img src={selectedProductDetail.image_url} alt={selectedProductDetail.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="h-full flex items-center justify-center text-slate-200">
                             <ImageIcon size={100} strokeWidth={1} />
                          </div>
                        )}
                        <div className="absolute top-6 left-6 px-4 py-2 bg-black/40 backdrop-blur text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                          {selectedProductDetail.category}
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Barcode size={14} className="text-indigo-600" /> ID Produk / SKU</p>
                           <p className="text-sm font-black text-slate-700 font-mono tracking-tight">{selectedProductDetail.barcode || 'N/A'}</p>
                        </div>
                        <div className="p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><DollarSign size={14} className="text-emerald-600" /> Harga Retail</p>
                           <p className="text-sm font-black text-emerald-700">Rp {Number(selectedProductDetail.price_retail || 0).toLocaleString()}</p>
                        </div>
                     </div>

                     <div className="p-6 bg-indigo-900 rounded-[2rem] text-white flex items-center justify-between shadow-xl shadow-indigo-100">
                        <div>
                           <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest mb-1">Total Stok Tersedia</p>
                           <p className="text-3xl font-black">{getProductTotalStock(selectedProductDetail.id)} <span className="text-xs font-bold">PCS</span></p>
                        </div>
                        <div className="text-right">
                           <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest mb-1">Lokasi</p>
                           <p className="text-xs font-black uppercase">{selectedLocationId === 'all' ? 'Gabungan Semua Lokasi' : locations.find((l:any) => l.id === selectedLocationId)?.name}</p>
                        </div>
                     </div>
                  </div>

                  <div className="space-y-8">
                     <div>
                        <h3 className="text-2xl font-black text-slate-900 leading-tight">{selectedProductDetail.name}</h3>
                        <div className="h-1 w-12 bg-indigo-600 rounded-full mt-4"></div>
                     </div>

                     <div className="space-y-6">
                        {Object.entries(getProductColorSizeStock(selectedProductDetail.id, selectedLocationId)).map(([color, sizes]) => (
                          <div key={color} className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
                             <div className="flex items-center gap-3 mb-5">
                                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><Palette size={16} /></div>
                                <h4 className="font-black text-sm text-slate-800 uppercase tracking-widest">{color}</h4>
                             </div>
                             <div className="grid grid-cols-3 gap-3">
                                {Object.entries(sizes as Record<string, number>).map(([size, qty]) => (
                                  <div key={size} className={`p-3 rounded-2xl flex flex-col items-center justify-center border transition-all ${qty > 0 ? 'bg-slate-50 border-slate-100' : 'bg-slate-50/30 border-dashed border-slate-200 opacity-60'}`}>
                                     <span className="text-[10px] font-black text-slate-400 mb-1 uppercase tracking-tighter">{size}</span>
                                     <span className={`text-sm font-black ${qty > 0 ? 'text-indigo-600' : 'text-slate-300'}`}>{qty}</span>
                                  </div>
                                ))}
                             </div>
                          </div>
                        ))}
                        {Object.keys(getProductColorSizeStock(selectedProductDetail.id, selectedLocationId)).length === 0 && (
                          <div className="py-16 text-center bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-100">
                             <Package size={40} className="mx-auto text-slate-200 mb-4" />
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tidak ada stok tersedia</p>
                          </div>
                        )}
                     </div>

                     <div className="pt-6">
                        <button 
                           onClick={() => setSelectedProductDetail(null)}
                           className="w-full py-5 bg-slate-900 text-white font-black rounded-3xl uppercase tracking-widest text-[10px] shadow-xl hover:bg-indigo-600 transition-all"
                        >
                           Tutup
                        </button>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
