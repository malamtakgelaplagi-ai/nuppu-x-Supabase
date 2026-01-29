
import React, { useContext, useState, useMemo, useEffect } from 'react';
import { DataContext } from '../App';
import { 
  ShoppingCart, Search, Plus, Minus, Trash2, 
  CheckCircle2, 
  MapPin, Barcode, ImageIcon, X, Loader2, Banknote, QrCode, Palette, Printer, ShoppingBag, AlertCircle, CreditCard, Copy, Wifi, WifiOff,
  Wallet,
  Box,
  UserPlus,
  Phone,
  User,
  FileText
} from 'lucide-react';
import { SaleType, SizeTarget } from '../types';
import { db } from '../services/supabase';

interface CartItem {
  productId: string;
  productName: string;
  size: string;
  qty: number;
  price: number;
  priceConsignment: number; 
  discountPercent: number; 
  color: string;
  stockUnitId?: string;
}

const SALES_SOURCES = ["Sosmed/WA", "Pameran", "Marketplace", "Dropshipper Lama", "Dropshipper Umum", "Reseller", "Customer", "Member"];
const PAYMENT_METHODS = [
  { id: 'Cash', icon: <Banknote size={14} /> },
  { id: 'EDC', icon: <CreditCard size={14} /> },
  { id: 'Trsf', icon: <QrCode size={14} /> }
];

export const POS: React.FC = () => {
  const context = useContext(DataContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [saleType, setSaleType] = useState<SaleType>(SaleType.RETAIL);
  const [customerName, setCustomerName] = useState('Pelanggan Umum');
  const [salesSource, setSalesSource] = useState('Sosmed/WA');
  const [globalDiscountPercent, setGlobalDiscountPercent] = useState(0);
  const [discountNote, setDiscountNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [isDP, setIsDP] = useState(false);
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutError, setCheckoutError] = useState<any>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<any>(null);

  const [isCustModalOpen, setIsCustModalOpen] = useState(false);
  const [newCustForm, setNewCustForm] = useState({ name: '', phone: '', address: '', note: '' });

  if (!context) return null;
  const { data, currentLocationId, refreshData, currentUser, isOnline, showModal } = context;

  const products = data?.Produk || [];
  const locations = data?.Lokasi || [];
  const stockUnits = data?.StokUnit || [];
  const allCustomers = data?.Pelanggan || [];
  const activeLocation = locations.find((l: any) => l.id === currentLocationId);

  const filteredCustomers = useMemo(() => {
    return allCustomers.filter((c: any) => c.location_id === currentLocationId);
  }, [allCustomers, currentLocationId]);

  const getProductColorSizeStock = (productId: string, locationId: string) => {
    const colorSizeMap: Record<string, Record<string, number>> = {};
    stockUnits
      .filter((s: any) => String(s.product_id) === String(productId) && String(s.location_id) === String(locationId))
      .forEach((s: any) => {
        const color = s.color || 'Umum';
        const size = s.size || 'N/A';
        const qty = Number(s.qty) || 0;
        if (!colorSizeMap[color]) colorSizeMap[color] = {};
        colorSizeMap[color][size] = qty;
      });
    return colorSizeMap;
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p: any) => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (p.barcode && p.barcode.includes(searchTerm));
      const colorStockMap = getProductColorSizeStock(p.id, currentLocationId);
      let totalStockAtLocation = 0;
      Object.values(colorStockMap).forEach(sizes => {
        Object.values(sizes).forEach(qty => {
          totalStockAtLocation += qty;
        });
      });
      return matchesSearch && totalStockAtLocation > 0;
    });
  }, [products, searchTerm, currentLocationId, stockUnits]);

  const addToCart = (product: any, color: string, size: string, price: number, qtyInStock: number) => {
    if (qtyInStock <= 0) return showModal({ title: 'Stok Habis', message: 'Produk tidak tersedia di lokasi ini.', type: 'error' });
    const existingIdx = cart.findIndex(c => c.productId === product.id && c.color === color && c.size === size);
    if (existingIdx !== -1) {
      if (cart[existingIdx].qty >= qtyInStock) return showModal({ title: 'Batas Stok', message: 'Jumlah keranjang sudah mencapai batas stok tersedia.', type: 'alert' });
      const newCart = [...cart];
      newCart[existingIdx].qty += 1;
      setCart(newCart);
    } else {
      const margin = Number(activeLocation?.consignment_margin || 0);
      const isPusat = currentLocationId === 'loc-pusat';
      const consPricePerItem = isPusat ? price : price * (1 - (margin / 100));
      
      setCart([...cart, {
        productId: product.id,
        productName: product.name,
        color: color,
        size: size,
        qty: 1,
        price: Number(price),
        priceConsignment: Number(consPricePerItem),
        discountPercent: 0
      }]);
    }
    setSelectedProduct(null);
  };

  const subTotal = cart.reduce((sum, item) => sum + (item.price * (1 - item.discountPercent / 100) * item.qty), 0);
  const totalDiscount = subTotal * (globalDiscountPercent / 100);
  const cartTotal = Math.max(0, subTotal - totalDiscount);
  
  const isBillingMode = saleType === SaleType.KONSINYASI || saleType === SaleType.PUTUS;
  const finalPaid = isDP ? (Number(paidAmount) || 0) : (isBillingMode ? 0 : cartTotal);
  const remainingReceivable = Math.max(0, cartTotal - finalPaid);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (currentLocationId === 'all') return showModal({ title: 'Pilih Lokasi', message: 'Pilih lokasi spesifik sebelum memproses transaksi.', type: 'alert' });
    
    setIsProcessing(true);
    setCheckoutError(null);
    
    const saleId = `INV${Date.now()}${Math.floor(Math.random() * 999)}`;
    const today = new Date().toISOString().split('T')[0];

    const isPusat = currentLocationId === 'loc-pusat';
    const effectiveType = !isPusat ? SaleType.KONSINYASI : saleType;
    const margin = Number(activeLocation?.consignment_margin || 0);
    const totalConsignment = isPusat ? cartTotal : cartTotal * (1 - (margin / 100));

    const saleData = {
      id: saleId,                                    
      date: today,                                  
      customer_name: String(customerName || 'Pelanggan Umum'), 
      location_id: String(currentLocationId),         
      total_price: Number(cartTotal) || 0,           
      total_consignment: Number(totalConsignment) || 0, 
      total_discount: Number(totalDiscount) || 0,     
      payment_method: String(paymentMethod),          
      status: remainingReceivable > 1 ? 'UNPAID' : 'PAID', 
      items: JSON.stringify(cart),                                   
      sales_source: String(salesSource),              
      paid_amount: Number(finalPaid) || 0,           
      remaining_amount: Number(remainingReceivable) || 0, 
      type: String(effectiveType),                        
      discount_note: String(discountNote || '')       
    };

    try {
      const result = await db.sales.create(saleData);
      if (result && !result.error) {
        for (const item of cart) {
          await db.mutations.create({
            id: `MUTPOS${Date.now()}${Math.floor(Math.random()*1000)}`,
            date: today,
            from_location_id: currentLocationId,
            to_location_id: 'CONSUMER',
            product_id: item.productId,
            qty: item.qty,
            note: `[${item.color}] Jual: ${item.productName} (${item.size})`,
            admin_name: currentUser?.name || 'Kasir'
          });
          
          await db.inventory.adjustStock(
            item.productId,
            currentLocationId,
            item.color,
            item.size,
            -item.qty
          );
        }
        setLastTransaction({ ...saleData, cart: [...cart], subTotal });
        setShowInvoiceModal(true);
        refreshData();
        setCart([]);
        setIsDP(false);
        setPaidAmount('');
      } else {
        setCheckoutError(result?.error || { message: "Gagal menyimpan ke database." });
      }
    } catch (e: any) {
      setCheckoutError({ message: e.message || "Checkout failed." });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickCustomerAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustForm.name || !newCustForm.phone) return showModal({ title: 'Data Kurang', message: 'Lengkapi nama dan nomor HP pelanggan.', type: 'alert' });
    setIsProcessing(true);
    const result = await db.customers.upsert({
      id: crypto.randomUUID(),
      name: newCustForm.name,
      phone: newCustForm.phone,
      address: newCustForm.address,
      note: newCustForm.note,
      location_id: currentLocationId
    });

    if (result && !result.error) {
      await refreshData();
      setCustomerName(newCustForm.name);
      setNewCustForm({ name: '', phone: '', address: '', note: '' });
      setIsCustModalOpen(false);
    } else {
      showModal({ title: 'Gagal', message: 'Gagal menambahkan pelanggan baru.', type: 'error' });
    }
    setIsProcessing(false);
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
        <header className="bg-white p-8 border-b border-slate-200 shadow-sm space-y-6">
           <div className="flex justify-between items-center">
             <div>
               <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                 <ShoppingBag className="text-indigo-600" size={32} /> Kasir POS
               </h1>
               <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-2 flex items-center gap-2">
                 <MapPin size={12} className="text-indigo-400" /> Lokasi: <span className="text-indigo-600 font-black">{activeLocation?.name || 'Pilih Lokasi'}</span>
               </p>
             </div>
             <div className="flex items-center gap-4">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest ${isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                   {isOnline ? <><Wifi size={14} /> Terhubung</> : <><WifiOff size={14} /> Terputus</>}
                </div>
                <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
                  {(['RETAIL', 'KONSINYASI', 'PUTUS'] as SaleType[]).map(t => (
                    <button key={t} onClick={() => setSaleType(t)} className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${saleType === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>{t}</button>
                  ))}
                </div>
             </div>
           </div>
           <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input type="text" placeholder="Cari produk ready di lokasi ini..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-50 transition-all shadow-inner" />
              </div>
              <div className="relative w-full md:w-64">
                <Barcode className="absolute left-5 top-1/2 -translate-y-1/2 text-indigo-600" size={20} />
                <input type="text" placeholder="Scan SKU..." value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)} className="w-full pl-14 pr-6 py-4 bg-indigo-600 text-white placeholder:text-indigo-200 border border-indigo-500 rounded-2xl font-black text-sm uppercase outline-none focus:ring-4 focus:ring-indigo-200 transition-all shadow-lg" />
              </div>
           </div>
        </header>

        <div className="flex-1 p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto">
          {filteredProducts.map((p: any) => {
            const colorStockMap = getProductColorSizeStock(p.id, currentLocationId);
            let totalStock = 0;
            Object.values(colorStockMap).forEach(sizes => Object.values(sizes).forEach(qty => { totalStock += qty; }));
            
            return (
              <button key={p.id} onClick={() => setSelectedProduct(p)} className="bg-white p-5 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all text-left flex flex-col group overflow-hidden">
                <div className="aspect-square bg-slate-50 rounded-[2rem] mb-5 overflow-hidden border border-slate-50 relative">
                  {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" /> : <div className="h-full flex flex-col items-center justify-center text-slate-300"><ImageIcon size={48} strokeWidth={1} /></div>}
                  <div className={`absolute bottom-3 left-3 px-3 py-1 rounded-full text-[8px] font-black uppercase shadow-sm ${totalStock > 0 ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>Ready: {totalStock}</div>
                </div>
                <h3 className="font-black text-slate-800 text-sm line-clamp-2 mb-2 h-10">{p.name}</h3>
                <div className="mt-auto pt-4 border-t border-slate-50 flex justify-between items-center">
                   <p className="text-base font-black text-indigo-600">Rp {Number(p.price_retail || 0).toLocaleString()}</p>
                   <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors"><Plus size={16} /></div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="w-full max-w-md bg-white border-l border-slate-200 flex flex-col shadow-2xl z-20">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-3"><ShoppingCart className="text-indigo-600" size={24} /> Nota Baru</h2>
            <button onClick={() => { setCart([]); setCheckoutError(null); }} className="text-[10px] font-black text-rose-500 uppercase tracking-widest px-3 py-1.5 rounded-lg hover:bg-rose-50">Reset</button>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-1">
               <div className="flex justify-between items-center px-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Customer</label>
                  <button onClick={() => setIsCustModalOpen(true)} className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors">
                     <UserPlus size={14} />
                     <span className="text-[8px] font-black uppercase">Baru</span>
                  </button>
               </div>
               <select value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="Pelanggan Umum">Umum</option>
                  {filteredCustomers.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
               </select>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-4">
          {cart.map((item, idx) => (
            <div key={idx} className="p-5 bg-slate-50 rounded-[2rem] border border-slate-100 shadow-sm group">
               <div className="flex justify-between items-start mb-4">
                  <div className="flex-1 pr-4">
                     <h4 className="text-sm font-black text-slate-800 truncate">{item.productName}</h4>
                     <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 text-[8px] font-black uppercase rounded-md">{item.color}</span>
                        <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[8px] font-black uppercase rounded-md">{item.size}</span>
                     </div>
                  </div>
                  <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-rose-500"><Trash2 size={16} /></button>
               </div>
               <div className="flex justify-between items-center pt-4 border-t border-slate-200/50">
                  <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                    <button onClick={() => { const n = [...cart]; n[idx].qty = Math.max(1, n[idx].qty-1); setCart(n); }}><Minus size={14} /></button>
                    <span className="text-xs font-black text-slate-700 min-w-[20px] text-center">{item.qty}</span>
                    <button onClick={() => { const n = [...cart]; n[idx].qty += 1; setCart(n); }}><Plus size={14} /></button>
                  </div>
                  <p className="font-black text-indigo-600 text-sm">Rp {(item.price * (1 - item.discountPercent / 100) * item.qty).toLocaleString()}</p>
               </div>
            </div>
          ))}
        </div>

        <div className="p-8 bg-slate-900 text-white rounded-t-[3.5rem] shadow-2xl shadow-indigo-200/20 space-y-6">
           {checkoutError && (
             <div className="p-5 bg-rose-500/20 border border-rose-500 rounded-3xl space-y-3">
                <p className="text-[10px] font-mono text-rose-200 leading-tight">{checkoutError.message || JSON.stringify(checkoutError)}</p>
             </div>
           )}

           <div className="flex gap-2">
             {PAYMENT_METHODS.map(m => (
               <button key={m.id} onClick={() => setPaymentMethod(m.id)} className={`flex-1 flex flex-col items-center py-2 rounded-xl text-[8px] font-black uppercase border transition-all ${paymentMethod === m.id ? 'bg-indigo-600 border-indigo-500' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                 {m.icon} <span className="mt-1">{m.id}</span>
               </button>
             ))}
           </div>

           <div className="pt-4 border-t border-white/10 space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-black text-indigo-300 uppercase mb-1">Total Nota</p>
                  <p className="text-3xl font-black">Rp {cartTotal.toLocaleString()}</p>
                </div>
                {remainingReceivable > 0 && (
                   <div className="text-right">
                      <p className="text-[9px] font-black text-rose-400 uppercase mb-1">Piutang</p>
                      <p className="text-sm font-black text-rose-500">Rp {remainingReceivable.toLocaleString()}</p>
                   </div>
                )}
              </div>

              <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-3">
                 <div className="flex items-center justify-between">
                    <label className="flex items-center gap-3 cursor-pointer group">
                       <input 
                          type="checkbox" 
                          checked={isDP} 
                          onChange={(e) => setIsDP(e.target.checked)} 
                          className="w-5 h-5 rounded-lg border-white/20 bg-transparent text-indigo-500 focus:ring-0 cursor-pointer" 
                       />
                       <span className="text-[10px] font-black uppercase text-indigo-300 group-hover:text-white transition-colors">Bayar DP / Sebagian</span>
                    </label>
                    <Wallet size={16} className={isDP ? "text-indigo-400" : "text-white/20"} />
                 </div>
                 {isDP && (
                   <input 
                    type="number" 
                    placeholder="Nominal bayar..." 
                    value={paidAmount} 
                    onChange={(e) => setPaidAmount(e.target.value)} 
                    className="w-full px-4 py-3 bg-white/10 border border-indigo-500/50 rounded-xl text-sm font-black text-white outline-none focus:ring-2 focus:ring-indigo-500" 
                  />
                 )}
              </div>
           </div>
           
           <button 
              disabled={isProcessing || cart.length === 0} 
              onClick={handleCheckout} 
              className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-[2rem] font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-4 shadow-2xl active:scale-95"
           >
             {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle2 size={20} /> Checkout</>}
           </button>
        </div>
      </div>

      {isCustModalOpen && (
        <div className="fixed inset-0 z-[350] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setIsCustModalOpen(false)}></div>
           <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl relative z-10 animate-in zoom-in-95 flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-center mb-6 shrink-0">
                 <h3 className="text-xl font-black text-slate-800">Pelanggan Baru</h3>
                 <button onClick={() => setIsCustModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><X size={20} /></button>
              </div>
              <form onSubmit={handleQuickCustomerAdd} className="space-y-4 overflow-y-auto pr-1">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Lengkap</label>
                    <input required value={newCustForm.name} onChange={(e) => setNewCustForm({...newCustForm, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none" placeholder="Nama..." />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp</label>
                    <input required type="tel" value={newCustForm.phone} onChange={(e) => setNewCustForm({...newCustForm, phone: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none" placeholder="62812xxx" />
                 </div>
                 <button type="submit" disabled={isProcessing} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg flex items-center justify-center gap-2">
                    {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />} Simpan
                 </button>
              </form>
           </div>
        </div>
      )}

      {selectedProduct && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={() => setSelectedProduct(null)}></div>
          <div className="bg-white rounded-[3rem] p-8 w-full max-w-2xl shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[85vh]">
             <div className="flex justify-between items-start mb-8 pb-6 border-b border-slate-100">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">{selectedProduct.name}</h2>
                <button onClick={() => setSelectedProduct(null)} className="p-3 hover:bg-slate-100 rounded-full text-slate-400"><X size={28} /></button>
             </div>
             <div className="flex-1 overflow-y-auto pr-2">
                <div className="space-y-8">
                   {Object.entries(getProductColorSizeStock(selectedProduct.id, currentLocationId)).map(([color, sizes]) => {
                     const sizeEntries = Object.entries(sizes).filter(([_, qty]) => qty > 0);
                     if (sizeEntries.length === 0) return null;
                     return (
                        <div key={color} className="space-y-4">
                           <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2"><Palette size={16} /> {color}</h3>
                           <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                              {sizeEntries.map(([size, qty]) => (
                                <button key={size} onClick={() => addToCart(selectedProduct, color, size, selectedProduct.price_retail, qty)} className="p-4 rounded-[1.5rem] border-2 border-slate-100 bg-slate-50 hover:border-indigo-600 hover:bg-white transition-all text-center flex flex-col items-center">
                                   <span className="text-[10px] font-black text-slate-400 mb-1">{size}</span>
                                   <span className="text-xs font-black text-slate-800">Stok: {qty}</span>
                                </button>
                              ))}
                           </div>
                        </div>
                     );
                   })}
                </div>
             </div>
          </div>
        </div>
      )}

      {showInvoiceModal && lastTransaction && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md no-print" onClick={() => setShowInvoiceModal(false)}></div>
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
             <div id="invoice-print" className="p-10 space-y-8 bg-white overflow-y-auto relative">
                {/* Status Lunas/Belum Lunas Stempel */}
                <div className="absolute top-10 right-10 pointer-events-none rotate-12 opacity-80">
                   {lastTransaction.status === 'PAID' ? (
                     <div className="border-4 border-emerald-500 text-emerald-500 px-4 py-2 rounded-xl font-black text-2xl uppercase tracking-widest">
                       Lunas
                     </div>
                   ) : (
                     <div className="border-4 border-rose-500 text-rose-500 px-4 py-2 rounded-xl font-black text-xl uppercase tracking-widest leading-none text-center">
                       Belum<br/>Lunas
                     </div>
                   )}
                </div>

                <div className="text-center space-y-1">
                   <h1 className="text-3xl font-black text-indigo-600 tracking-tighter">NUPPU</h1>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{activeLocation?.name}</p>
                </div>

                <div className="flex justify-between items-start border-t border-b border-slate-100 py-4">
                   <div className="space-y-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase">Customer</p>
                      <p className="text-sm font-black text-slate-800">{lastTransaction.customer_name}</p>
                   </div>
                   <div className="text-right space-y-1">
                      <p className="text-xs font-black text-indigo-600">{lastTransaction.id}</p>
                      <p className="text-[9px] font-bold text-slate-400">{lastTransaction.date}</p>
                   </div>
                </div>

                <div className="space-y-3">
                   {lastTransaction.cart.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-xs">
                         <div className="flex-1 pr-4">
                            <p className="font-black text-slate-800">{item.productName}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">{item.color} • {item.size} x {item.qty}</p>
                         </div>
                         <p className="font-black text-slate-800">Rp {(item.price * (1 - item.discountPercent / 100) * item.qty).toLocaleString()}</p>
                      </div>
                   ))}
                </div>

                <div className="border-t border-dashed border-slate-200 pt-4 space-y-2">
                   <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase">Total Nota</span>
                      <span className="text-sm font-black text-slate-800">Rp {lastTransaction.total_price.toLocaleString()}</span>
                   </div>
                   <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase">Sudah Bayar</span>
                      <span className="text-sm font-black text-indigo-600">Rp {lastTransaction.paid_amount.toLocaleString()}</span>
                   </div>
                   
                   {lastTransaction.status !== 'PAID' && (
                     <div className="flex justify-between items-center border-t border-slate-50 pt-2">
                        <span className="text-[10px] font-black text-rose-500 uppercase">Sisa Tagihan</span>
                        <span className="text-base font-black text-rose-600 underline decoration-double">
                          Rp {Number(lastTransaction.remaining_amount).toLocaleString()}
                        </span>
                     </div>
                   )}
                </div>

                <div className="text-center pt-4 border-t border-slate-50">
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">Barang yang sudah dibeli tidak dapat ditukar</p>
                   <p className="text-[10px] font-black text-indigo-600 uppercase mt-1">Terima Kasih Atas Kepercayaan Anda</p>
                </div>
             </div>

             <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4 no-print">
                <button onClick={() => window.print()} className="flex-1 py-4 bg-white border border-slate-200 font-black rounded-2xl flex items-center justify-center gap-2 text-[10px] uppercase transition-all hover:bg-slate-100">
                   <Printer size={16} /> Cetak Struk
                </button>
                <button onClick={() => { setShowInvoiceModal(false); setCart([]); setCheckoutError(null); }} className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl flex items-center justify-center gap-2 text-[10px] uppercase transition-all hover:bg-indigo-700">
                   <Plus size={16} /> Transaksi Baru
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
