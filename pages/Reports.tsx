
import React, { useContext, useState, useMemo, useEffect } from 'react';
import { DataContext } from '../App';
import { 
  BarChart3, TrendingUp, ShoppingBag, Package, 
  Layers, Calculator, Calendar, Download, 
  Search, Filter, ArrowUpRight, ArrowDownRight,
  Printer, FileText, PieChart, Info, AlertCircle,
  Banknote, ShoppingCart, Scissors, Palette, ArrowLeftRight, ArrowRight, MapPin, ChevronRight, TrendingDown, User, CreditCard, Eye, X, ReceiptText, Tag, Hash,
  CheckCircle2, Medal, Trophy, ShoppingBasket, UserCheck, Star, Building2,
  Box,
  Clock,
  Target,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ArrowUpDown,
  Minus,
  FileDown
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

type ReportTab = 'SALES' | 'PURCHASES' | 'PRODUCTION' | 'MUTATIONS';
type SalesSubTab = 'TRANSACTIONS' | 'PRODUCTS' | 'CUSTOMERS';

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export const Reports: React.FC = () => {
  const context = useContext(DataContext);
  if (!context) return null;
  const { data, loading, currentUser, currentLocationId } = context;

  const isKasir = currentUser?.role === 'KASIR';
  const isPusat = currentLocationId === 'loc-pusat';

  const [activeTab, setActiveTab] = useState<ReportTab>('SALES');
  const [salesSubTab, setSalesSubTab] = useState<SalesSubTab>('TRANSACTIONS');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const [reportLocationId, setReportLocationId] = useState(isKasir ? currentUser?.location_id : 'ALL');

  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [showSaleDetail, setShowSaleDetail] = useState(false);

  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'date', direction: 'desc' });

  const sales = data?.Penjualan || [];
  const production = data?.Produksi || [];
  const products = data?.Produk || [];
  const mutations = data?.Mutasi || [];
  const locations = data?.Lokasi || [];

  const availableTabs = useMemo(() => {
    const tabs: ReportTab[] = ['SALES', 'PRODUCTION', 'MUTATIONS'];
    if (!isPusat) return tabs.filter(t => t !== 'PRODUCTION');
    return tabs;
  }, [isPusat]);

  useEffect(() => {
    if (!isPusat && activeTab === 'PRODUCTION') setActiveTab('SALES');
  }, [isPusat, activeTab]);

  const safeParseItems = (itemsStr: any) => {
    if (!itemsStr) return [];
    try { return typeof itemsStr === 'string' ? JSON.parse(itemsStr) : itemsStr; } catch (e) { return []; }
  };

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return <ArrowUpDown size={12} className="opacity-20" />;
    return sortConfig.direction === 'asc' ? <ChevronUp size={14} className="text-indigo-600" /> : <ChevronDown size={14} className="text-indigo-600" />;
  };

  const filteredSalesBase = useMemo(() => {
    return sales.filter((s: any) => {
      const matchesDate = s.date >= dateRange.start && s.date <= dateRange.end;
      const custName = (s.customer_name || s.customerName || '').toLowerCase();
      const matchesCustomer = custName.includes(customerSearch.toLowerCase());
      const matchesMethod = methodFilter === 'ALL' || s.payment_method === methodFilter;
      const matchesLocation = reportLocationId === 'ALL' ? (!isKasir || s.location_id === currentUser.location_id) : s.location_id === reportLocationId;
      return matchesDate && matchesCustomer && matchesMethod && matchesLocation;
    });
  }, [sales, dateRange, customerSearch, methodFilter, isKasir, currentUser, reportLocationId]);

  const sortedSales = useMemo(() => {
    const items = [...filteredSalesBase];
    items.sort((a: any, b: any) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];
      if (sortConfig.key === 'total_price') { aValue = Number(aValue) || 0; bValue = Number(bValue) || 0; }
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return items;
  }, [filteredSalesBase, sortConfig]);

  const productPerformance = useMemo(() => {
    const perfMap: Record<string, { name: string, color: string, size: string, totalQty: number, totalRevenue: number }> = {};
    filteredSalesBase.forEach((sale: any) => {
      const items = safeParseItems(sale.items);
      items.forEach((item: any) => {
        const key = `${item.productId}-${item.color}-${item.size}`;
        if (!perfMap[key]) {
          perfMap[key] = { name: item.productName, color: item.color, size: item.size, totalQty: 0, totalRevenue: 0 };
        }
        perfMap[key].totalQty += (Number(item.qty) || 0);
        const itemPrice = Number(item.price) || 0;
        perfMap[key].totalRevenue += (itemPrice * (Number(item.qty) || 0));
      });
    });
    return Object.values(perfMap).filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).sort((a, b) => b.totalQty - a.totalQty);
  }, [filteredSalesBase, productSearch]);

  const customerPerformance = useMemo(() => {
    const custMap: Record<string, { name: string, orderCount: number, totalQty: number, totalSpend: number }> = {};
    filteredSalesBase.forEach((sale: any) => {
      const name = sale.customer_name || 'Pelanggan Umum';
      if (!custMap[name]) custMap[name] = { name, orderCount: 0, totalQty: 0, totalSpend: 0 };
      custMap[name].orderCount += 1;
      custMap[name].totalSpend += (Number(sale.total_price) || 0);
      const items = safeParseItems(sale.items);
      custMap[name].totalQty += items.reduce((sum: number, it: any) => sum + (Number(it.qty) || 0), 0);
    });
    return Object.values(custMap).filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())).sort((a, b) => b.totalSpend - a.totalSpend);
  }, [filteredSalesBase, customerSearch]);

  const salesStats = useMemo(() => {
    let directGross = 0;
    let directDiscount = 0;
    let consignmentShare = 0;

    filteredSalesBase.forEach((s: any) => {
      const net = Number(s.total_price) || 0;
      const disc = Number(s.total_discount) || 0;
      directGross += (net + disc);
      directDiscount += disc;

      if (s.location_id !== 'loc-pusat') {
        consignmentShare += (Number(s.total_consignment) || 0);
      }
    });

    const directNet = directGross - directDiscount;
    const totalRev = isPusat ? (directNet + consignmentShare) : directNet;
    const topProduct = productPerformance[0] ? [productPerformance[0].name, productPerformance[0].totalQty] : ['-', 0];
    
    return { 
      totalRev, 
      directGross, 
      directDiscount, 
      directNet, 
      consignmentShare, 
      count: filteredSalesBase.length, 
      topProduct 
    };
  }, [filteredSalesBase, productPerformance, isPusat]);

  const filteredProduction = useMemo(() => {
    return production.filter((b: any) => b.start_date >= dateRange.start && b.start_date <= dateRange.end).sort((a: any, b: any) => b.start_date.localeCompare(a.start_date));
  }, [production, dateRange]);

  const filteredMutations = useMemo(() => {
    return mutations.filter((m: any) => {
      const matchesDate = m.date >= dateRange.start && m.date <= dateRange.end;
      const involvesLoc = reportLocationId === 'ALL' ? (isPusat || m.from_location_id === currentLocationId || m.to_location_id === currentLocationId) : (m.from_location_id === reportLocationId || m.to_location_id === reportLocationId);
      return matchesDate && involvesLoc;
    }).sort((a: any, b: any) => b.date.localeCompare(a.date));
  }, [mutations, dateRange, isPusat, currentLocationId, reportLocationId]);

  const openSaleDetail = (sale: any) => {
    setSelectedSale(sale);
    setShowSaleDetail(true);
  };

  // --- PDF EXPORT LOGIC ---
  const handleExportPDF = () => {
    const doc = new jsPDF();
    const locName = reportLocationId === 'ALL' ? 'Semua Lokasi' : (locations.find(l => l.id === reportLocationId)?.name || 'Cabang');
    
    // Header
    doc.setFontSize(18);
    doc.text('LAPORAN NUPPU PRO', 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Periode: ${dateRange.start} s/d ${dateRange.end}`, 14, 27);
    doc.text(`Lokasi: ${locName}`, 14, 32);
    
    if (activeTab === 'SALES') {
      if (salesSubTab === 'TRANSACTIONS') {
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text('DAFTAR TRANSAKSI PENJUALAN', 14, 45);
        
        const head = isPusat 
          ? [['No. Nota', 'Tanggal', 'Customer', 'Metode', 'Total', 'Hak Pusat']]
          : [['No. Nota', 'Tanggal', 'Customer', 'Metode', 'Total']];
        
        const body = sortedSales.map(s => {
          const row = [
            s.id,
            s.date,
            s.customer_name || 'Umum',
            s.payment_method,
            `Rp ${Number(s.total_price).toLocaleString()}`
          ];
          if (isPusat) {
            const isDirect = s.location_id === 'loc-pusat';
            const val = isDirect ? Number(s.total_price) : Number(s.total_consignment);
            row.push(`Rp ${val.toLocaleString()}`);
          }
          return row;
        });

        (doc as any).autoTable({
          startY: 50,
          head,
          body,
          theme: 'striped',
          headStyles: { fillColor: [67, 56, 202] }
        });
      } else if (salesSubTab === 'PRODUCTS') {
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text('PERFORMA PENJUALAN PRODUK', 14, 45);
        
        const head = [['Nama Produk', 'Varian', 'Size', 'Qty Terjual', 'Pendapatan Bruto']];
        const body = productPerformance.map(p => [
          p.name,
          p.color,
          p.size,
          `${p.totalQty} PCS`,
          `Rp ${p.totalRevenue.toLocaleString()}`
        ]);

        (doc as any).autoTable({
          startY: 50,
          head,
          body,
          theme: 'striped',
          headStyles: { fillColor: [67, 56, 202] }
        });
      } else if (salesSubTab === 'CUSTOMERS') {
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text('ANALISIS LOYALITAS CUSTOMER', 14, 45);
        
        const head = [['Nama Customer', 'Frek. Belanja', 'Total Item', 'Nilai Belanja']];
        const body = customerPerformance.map(c => [
          c.name,
          `${c.orderCount} Kali`,
          `${c.totalQty} PCS`,
          `Rp ${c.totalSpend.toLocaleString()}`
        ]);

        (doc as any).autoTable({
          startY: 50,
          head,
          body,
          theme: 'striped',
          headStyles: { fillColor: [67, 56, 202] }
        });
      }
    } else if (activeTab === 'MUTATIONS') {
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text('RIWAYAT MUTASI BARANG', 14, 45);
      
      const head = [['Tanggal', 'Item', 'Dari', 'Ke', 'Keterangan', 'Jumlah']];
      const body = filteredMutations.map(m => {
        const prod = products.find(p => String(p.id) === String(m.product_id));
        const fromLoc = locations.find(l => l.id === m.from_location_id)?.name || 'ENTRY';
        const toLoc = locations.find(l => l.id === m.to_location_id)?.name || 'DELETED';
        return [
          m.date,
          prod?.name || 'Unknown',
          fromLoc,
          toLoc,
          m.note || '-',
          `${m.qty} PCS`
        ];
      });

      (doc as any).autoTable({
        startY: 50,
        head,
        body,
        theme: 'striped',
        headStyles: { fillColor: [67, 56, 202] }
      });
    }

    const fileName = `Report_Nuppu_${activeTab}_${new Date().toISOString().slice(0,10)}.pdf`;
    doc.save(fileName);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Laporan Performa</h1>
          <p className="text-slate-500 font-medium">Monitoring data bisnis & pendapatan terpisah.</p>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm min-w-[220px]">
            <Building2 size={18} className="text-indigo-600 ml-1" />
            <select disabled={isKasir} value={reportLocationId} onChange={(e) => setReportLocationId(e.target.value)} className="w-full text-xs font-black uppercase tracking-widest outline-none bg-transparent appearance-none cursor-pointer disabled:opacity-60">
              {!isKasir && <option value="ALL">Semua Cabang</option>}
              {locations.map((loc: any) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
            </select>
            <ChevronDown size={14} className="text-slate-300 pointer-events-none" />
          </div>

          <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
            <Calendar size={18} className="text-indigo-600 ml-1" />
            <input type="date" value={dateRange.start} onChange={(e) => setDateRange({...dateRange, start: e.target.value})} className="text-xs font-black outline-none bg-transparent" />
            <span className="text-[10px] font-black text-slate-300">S/D</span>
            <input type="date" value={dateRange.end} onChange={(e) => setDateRange({...dateRange, end: e.target.value})} className="text-xs font-black outline-none bg-transparent" />
          </div>
        </div>
      </header>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex bg-slate-200/50 p-1.5 rounded-[1.8rem] w-fit shadow-inner border border-slate-200/50">
          {availableTabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-10 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-indigo-600 shadow-md scale-105' : 'text-slate-500 hover:text-slate-700'}`}>
              {tab === 'SALES' ? <TrendingUp size={16} className="inline mr-2" /> : tab === 'PRODUCTION' ? <Layers size={16} className="inline mr-2" /> : <ArrowLeftRight size={16} className="inline mr-2" />}
              {tab}
            </button>
          ))}
        </div>
        
        {/* Tombol Export Global di Header Konten */}
        <button 
          onClick={handleExportPDF}
          className="px-6 py-3.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all shadow-lg active:scale-95"
        >
          <FileDown size={16} /> Export PDF
        </button>
      </div>

      <div className="space-y-8">
         {activeTab === 'SALES' && (
           <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                 <div className="p-8 bg-indigo-600 text-white rounded-[2.5rem] shadow-xl shadow-indigo-100 md:col-span-2 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                    <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">
                      {isPusat ? 'Total Omzet Bersih Gabungan (Pusat)' : 'Total Penjualan Bersih Cabang'}
                    </p>
                    <h3 className="text-4xl font-black">Rp {salesStats.totalRev.toLocaleString()}</h3>
                    
                    <div className={`mt-6 grid ${isPusat ? 'grid-cols-2' : 'grid-cols-1'} gap-4 border-t border-white/20 pt-6`}>
                       <div>
                          <p className="text-[9px] font-black text-indigo-200 uppercase tracking-widest opacity-60">
                             {isPusat ? 'Jualan Langsung (Net)' : 'Penjualan Langsung (Net)'}
                          </p>
                          <div className="flex items-center gap-1.5 text-[8px] font-bold text-indigo-100/50 mb-0.5">
                             <span>Rp {salesStats.directGross.toLocaleString()}</span>
                             <Minus size={8} />
                             <span className="text-rose-300">Rp {salesStats.directDiscount.toLocaleString()} (Disc)</span>
                          </div>
                          <p className="text-sm font-black text-white">Rp {salesStats.directNet.toLocaleString()}</p>
                       </div>
                       {isPusat && (
                        <div>
                           <p className="text-[9px] font-black text-indigo-200 uppercase tracking-widest opacity-60">Bagi Hasil Cabang (Net)</p>
                           <p className="text-xs font-bold text-indigo-100 mb-0.5 uppercase">Setoran Terverifikasi</p>
                           <p className="text-sm font-black text-white">Rp {salesStats.consignmentShare.toLocaleString()}</p>
                        </div>
                       )}
                    </div>
                 </div>
                 <div className="p-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl w-fit mb-4"><ShoppingCart size={24} /></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Transaksi</p>
                    <h3 className="text-2xl font-black text-slate-900">{salesStats.count} Nota</h3>
                 </div>
                 <div className="p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm relative overflow-hidden group">
                    <Trophy size={80} className="absolute -right-4 -bottom-4 opacity-5 text-indigo-600" />
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl w-fit mb-4"><Medal size={24} /></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Top Produk Terlaris</p>
                    <h3 className="text-lg font-black truncate text-slate-900">{salesStats.topProduct[0]}</h3>
                    <p className="text-[10px] font-bold text-indigo-600 mt-1 uppercase tracking-widest">{salesStats.topProduct[1]} Unit Terjual</p>
                 </div>
              </div>

              <div className="bg-white rounded-[3rem] p-4 border border-slate-100 shadow-sm">
                 <div className="flex flex-wrap gap-2">
                    {(['TRANSACTIONS', 'PRODUCTS', 'CUSTOMERS'] as SalesSubTab[]).map(sub => (
                       <button key={sub} onClick={() => setSalesSubTab(sub)} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${salesSubTab === sub ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>
                         {sub === 'TRANSACTIONS' ? 'Daftar Transaksi' : sub === 'PRODUCTS' ? 'Performa Produk' : 'Analisis Customer'}
                       </button>
                    ))}
                 </div>
              </div>

              <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
                 {salesSubTab === 'TRANSACTIONS' && (
                    <div className="flex flex-col">
                       <div className="p-6 border-b border-slate-50 bg-slate-50/20 flex flex-col md:flex-row justify-between gap-4">
                          <div className="relative flex-1 max-w-md">
                             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                             <input type="text" placeholder="Cari Customer atau Nota..." value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
                          </div>
                          <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none">
                             <option value="ALL">Semua Pembayaran</option><option value="Cash">Tunai (Cash)</option><option value="EDC">Kartu (EDC)</option><option value="Trsf">Transfer</option>
                          </select>
                       </div>
                       <div className="overflow-x-auto">
                          <table className="w-full text-left">
                             <thead>
                                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                                   <th className="px-8 py-5 cursor-pointer hover:bg-slate-50 transition-colors select-none" onClick={() => requestSort('date')}><div className="flex items-center gap-2">Nota & Tgl {getSortIcon('date')}</div></th>
                                   <th className="px-8 py-5 cursor-pointer hover:bg-slate-50 transition-colors select-none" onClick={() => requestSort('customer_name')}><div className="flex items-center gap-2">Customer {getSortIcon('customer_name')}</div></th>
                                   <th className="px-8 py-5"><div className="flex items-center gap-2">Metode</div></th>
                                   <th className="px-8 py-5 text-right cursor-pointer hover:bg-slate-50 transition-colors select-none" onClick={() => requestSort('total_price')}><div className="flex items-center justify-end gap-2">Total {getSortIcon('total_price')}</div></th>
                                   {isPusat && <th className="px-8 py-5 text-right text-indigo-600"><div className="flex items-center justify-end gap-2">Hak Pusat</div></th>}
                                   <th className="px-8 py-5 text-center">Aksi</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-50">
                                {sortedSales.map((sale: any) => {
                                   const isDirect = sale.location_id === 'loc-pusat';
                                   const hakPusat = isDirect ? Number(sale.total_price) : Number(sale.total_consignment);
                                   
                                   return (
                                   <tr key={sale.id} className="hover:bg-slate-50 transition-colors group">
                                      <td className="px-8 py-5"><p className="text-xs font-black text-slate-800 tracking-tighter">{sale.id}</p><p className="text-[9px] font-bold text-slate-400 uppercase">{sale.date}</p></td>
                                      <td className="px-8 py-5 text-xs font-black text-slate-600">{sale.customer_name || 'Pelanggan Umum'}</td>
                                      <td className="px-8 py-5"><span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg uppercase">{sale.payment_method}</span></td>
                                      <td className="px-8 py-5 text-right font-black text-slate-900 text-sm">Rp {Number(sale.total_price).toLocaleString()}</td>
                                      {isPusat && (
                                        <td className="px-8 py-5 text-right font-black text-indigo-600 text-sm">
                                          <p>Rp {hakPusat.toLocaleString()}</p>
                                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                                              {isDirect ? '(Direct Net)' : '(Setor Cabang)'}
                                          </p>
                                        </td>
                                      )}
                                      <td className="px-8 py-5 text-center"><button onClick={() => openSaleDetail(sale)} className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all"><Eye size={16} /></button></td>
                                   </tr>
                                   );
                                })}
                             </tbody>
                          </table>
                       </div>
                    </div>
                 )}

                 {salesSubTab === 'PRODUCTS' && (
                    <div className="flex flex-col">
                       <div className="p-6 border-b border-slate-50 bg-slate-50/20"><div className="relative max-w-md"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} /><input type="text" placeholder="Cari Performa Produk..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none" /></div></div>
                       <div className="overflow-x-auto">
                          <table className="w-full text-left">
                             <thead>
                                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                                   <th className="px-8 py-5">Nama Produk</th><th className="px-8 py-5">Varian & Size</th><th className="px-8 py-5 text-center">Qty Terjual</th><th className="px-8 py-5 text-right">Pendapatan Bruto</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-50">
                                {productPerformance.map((p, idx) => (
                                   <tr key={idx} className="hover:bg-slate-50">
                                      <td className="px-8 py-5"><div className="flex items-center gap-3">{idx < 3 && <Trophy size={14} className={idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-slate-400' : 'text-amber-700'} />}<p className="text-xs font-black text-slate-800">{p.name}</p></div></td>
                                      <td className="px-8 py-5"><div className="flex items-center gap-2"><span className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded uppercase">{p.color}</span><span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase">{p.size}</span></div></td>
                                      <td className="px-8 py-5 text-center font-black text-indigo-600 text-sm">{p.totalQty} <span className="text-[10px] text-slate-400">PCS</span></td>
                                      <td className="px-8 py-5 text-right font-black text-emerald-600 text-sm">Rp {p.totalRevenue.toLocaleString()}</td>
                                   </tr>
                                ))}
                             </tbody>
                          </table>
                       </div>
                    </div>
                 )}

                 {salesSubTab === 'CUSTOMERS' && (
                    <div className="flex flex-col">
                       <div className="p-6 border-b border-slate-50 bg-slate-50/20"><div className="relative max-w-md"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} /><input type="text" placeholder="Cari Loyalist Customer..." value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none" /></div></div>
                       <div className="overflow-x-auto">
                          <table className="w-full text-left">
                             <thead>
                                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                                   <th className="px-8 py-5">Nama Customer</th><th className="px-8 py-5 text-center">Frek. Belanja</th><th className="px-8 py-5 text-center">Total Item</th><th className="px-8 py-5 text-right">Nilai Belanja</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-50">
                                {customerPerformance.map((c, idx) => (
                                   <tr key={idx} className="hover:bg-slate-50">
                                      <td className="px-8 py-5"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-black text-[10px] uppercase">{c.name.charAt(0)}</div><p className="text-xs font-black text-slate-800">{c.name}</p></div></td>
                                      <td className="px-8 py-5 text-center text-xs font-bold text-slate-600">{c.orderCount} Kali</td>
                                      <td className="px-8 py-5 text-center text-xs font-bold text-slate-600">{c.totalQty} PCS</td>
                                      <td className="px-8 py-5 text-right font-black text-indigo-600">Rp {c.totalSpend.toLocaleString()}</td>
                                   </tr>
                                ))}
                             </tbody>
                          </table>
                       </div>
                    </div>
                 )}
              </div>
           </div>
         )}

         {activeTab === 'PRODUCTION' && isPusat && (
           <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
              <div className="p-6 bg-slate-50/20 border-b border-slate-50"><h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Layers size={16} /> Daftar Produksi Terkini</h3></div>
              <div className="overflow-x-auto">
                 <table className="w-full text-left">
                   <thead>
                      <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                         <th className="px-8 py-5">Batch ID</th><th className="px-8 py-5">Produk</th><th className="px-8 py-5">Tahapan Aktif</th><th className="px-8 py-5 text-center">Progress</th><th className="px-8 py-5 text-right">Target Qty</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                      {filteredProduction.map((b: any) => (
                        <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                           <td className="px-8 py-5 text-xs font-black text-slate-800">{b.code}</td>
                           <td className="px-8 py-5"><p className="text-xs font-black text-indigo-600">{products.find((p:any)=>p.id===b.product_id)?.name || 'N/A'}</p><p className="text-[9px] font-bold text-slate-400 uppercase">{b.variant_color}</p></td>
                           <td className="px-8 py-5 text-xs font-bold text-slate-600 uppercase tracking-tighter">{b.current_stage}</td>
                           <td className="px-8 py-5"><div className="flex items-center gap-3"><div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-indigo-600" style={{ width: `${b.progress}%` }}></div></div><span className="text-[10px] font-black text-slate-400">{b.progress}%</span></div></td>
                           <td className="px-8 py-5 text-right font-black text-slate-900 text-sm">{b.target} <span className="text-[10px] text-slate-400">PCS</span></td>
                        </tr>
                      ))}
                   </tbody>
                 </table>
              </div>
           </div>
         )}

         {activeTab === 'MUTATIONS' && (
            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
               <div className="p-6 bg-slate-50/20 border-b border-slate-50 flex items-center justify-between"><h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><ArrowLeftRight size={16} /> Riwayat Mutasi Barang</h3><div className="px-4 py-1.5 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center gap-2"><MapPin size={12} className="text-indigo-600" /><span className="text-[9px] font-black text-indigo-900 uppercase">{reportLocationId === 'ALL' ? 'SEMUA LOKASI' : locations.find(l => l.id === reportLocationId)?.name || 'CABANG AKTIF'}</span></div></div>
               <div className="overflow-x-auto">
                  <table className="w-full text-left">
                     <thead><tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50"><th className="px-8 py-5">Tgl & ID</th><th className="px-8 py-5">Item</th><th className="px-8 py-5">Rute Gudang</th><th className="px-8 py-5">Keterangan</th><th className="px-8 py-5 text-right">Jumlah</th></tr></thead>
                     <tbody className="divide-y divide-slate-50">
                        {filteredMutations.map((m: any) => {
                           const prod = products.find((p: any) => String(p.id) === String(m.product_id));
                           const fromLoc = locations.find((l:any) => l.id === m.from_location_id);
                           const toLoc = locations.find((l:any) => l.id === m.to_location_id);
                           return (
                              <tr key={m.id} className="hover:bg-slate-50">
                                 <td className="px-8 py-5"><p className="text-xs font-black text-slate-800">{m.date}</p><p className="text-[8px] font-bold text-slate-300 uppercase">{m.id}</p></td>
                                 <td className="px-8 py-5 text-xs font-black text-indigo-600">{prod?.name || 'Item Terhapus'}</td>
                                 <td className="px-8 py-5"><div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-tighter"><span className={m.from_location_id === reportLocationId ? "text-indigo-600" : "text-slate-500"}>{fromLoc?.name || 'STOCK ENTRY'}</span><ArrowRight size={10} className="text-indigo-300" /><span className={m.to_location_id === reportLocationId ? "text-indigo-600" : "text-slate-500"}>{toLoc?.name || m.to_location_id || 'TUJUAN'}</span></div></td>
                                 <td className="px-8 py-5 text-[10px] font-medium text-slate-400 max-w-xs truncate">{m.note}</td>
                                 <td className="px-8 py-5 text-right font-black text-slate-900 text-sm">{m.qty} <span className="text-[10px] text-slate-400">PCS</span></td>
                              </tr>
                           );
                        })}
                        {filteredMutations.length === 0 && (<tr><td colSpan={5} className="px-8 py-20 text-center text-slate-300"><Box size={40} className="mx-auto mb-2 opacity-20" /><p className="text-[10px] font-black uppercase tracking-widest">Tidak ada data mutasi ditemukan</p></td></tr>)}
                     </tbody>
                  </table>
               </div>
            </div>
         )}
      </div>

      {showSaleDetail && selectedSale && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowSaleDetail(false)}></div>
           <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md relative z-10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 max-h-[90vh]">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                 <div className="flex items-center gap-4"><div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg"><ReceiptText size={20} /></div><div><h2 className="text-lg font-black text-slate-800 tracking-tight">Detail Transaksi</h2><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{selectedSale.id}</p></div></div>
                 <button onClick={() => setShowSaleDetail(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-10 space-y-8">
                 <div className="flex justify-between items-start border-b border-slate-100 pb-6"><div className="space-y-1"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Customer</p><p className="text-sm font-black text-slate-800">{selectedSale.customer_name || 'Pelanggan Umum'}</p></div><div className="text-right space-y-1"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tanggal</p><p className="text-xs font-bold text-slate-600">{selectedSale.date}</p></div></div>
                 <div className="space-y-4"><p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-2">Item Terjual</p>{safeParseItems(selectedSale.items).map((item: any, i: number) => (<div key={i} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl"><div className="flex-1"><p className="text-xs font-black text-slate-800">{item.productName}</p><div className="flex items-center gap-2 mt-1"><span className="text-[8px] font-black bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded uppercase">{item.color}</span><span className="text-[8px] font-black bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded uppercase">{item.size}</span><span className="text-[8px] font-black text-slate-400">x {item.qty}</span></div></div><p className="text-xs font-black text-slate-700">Rp {(item.price * item.qty).toLocaleString()}</p></div>))}</div>
                 <div className="pt-6 border-t border-dashed border-slate-200 space-y-3"><div className="flex justify-between items-center text-xs font-bold text-slate-400"><span className="uppercase tracking-widest">Metode Bayar</span><span className="text-slate-600">{selectedSale.payment_method}</span></div><div className="flex justify-between items-center text-xs font-bold text-slate-400"><span className="uppercase tracking-widest">Total Diskon</span><span className="text-rose-400">Rp {Number(selectedSale.total_discount || 0).toLocaleString()}</span></div><div className="flex justify-between items-center pt-3"><span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Total Bayar</span><span className="text-xl font-black text-indigo-600">Rp {Number(selectedSale.total_price).toLocaleString()}</span></div></div>
              </div>
              <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
                 <button className="flex-1 py-4 bg-white border border-slate-200 rounded-2xl font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 hover:bg-slate-100 transition-all"><Printer size={16} /> Cetak Struk</button>
                 <button onClick={() => setShowSaleDetail(false)} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[9px] hover:bg-indigo-700 transition-all">Tutup</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
