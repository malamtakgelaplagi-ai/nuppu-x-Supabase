
import React, { useContext, useState } from 'react';
import { DataContext } from '../App';
import { 
  Search, Filter, ArrowUpRight, FlaskConical, 
  Shirt, Clock, AlertTriangle, CheckCircle2,
  TrendingUp, Archive, Scale, Tag
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SizeTarget, ProductionType } from '../types';

export const SampleGoods: React.FC = () => {
  const context = useContext(DataContext);
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  if (!context) return null;
  const { data, loading } = context;

  const products = data?.Produk || [];
  const batches = data?.Produksi || [];

  const sampleBatches = batches.filter((b: any) => 
    String(b.status).toUpperCase() === 'SELESAI' && 
    String(b.type).toUpperCase() === 'SAMPLE'
  );
  
  const totalSampleStock = sampleBatches.reduce((sum: number, b: any) => sum + (Number(b.actual_output) || 0), 0);

  const getSizeDistribution = (productId: string) => {
    const productBatches = sampleBatches.filter((b: any) => String(b.product_id) === String(productId));
    const distribution: Record<string, number> = {};

    productBatches.forEach((batch: any) => {
      try {
        let targets: SizeTarget[] = [];
        const rawTargets = batch.targets;
        
        if (rawTargets) {
            if (typeof rawTargets === 'string') {
                targets = JSON.parse(rawTargets);
            } else if (Array.isArray(rawTargets)) {
                targets = rawTargets;
            }
        }

        if (Array.isArray(targets)) {
          targets.forEach(t => {
            const qty = Number(t.resultQty || t.targetQty) || 0;
            if (t.size) {
                distribution[t.size] = (distribution[t.size] || 0) + qty;
            }
          });
        }
      } catch (e) { }
    });

    return Object.entries(distribution).sort((a, b) => a[0].localeCompare(b[0]));
  };

  const filteredProducts = products.filter((p: any) => {
    const hasHistory = sampleBatches.some((b: any) => String(b.product_id) === String(p.id));
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    return hasHistory && matchesSearch;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Gudang Sample</h1>
          <p className="text-slate-500 mt-1">Stok purwarupa (Sample) dari produksi.</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl"><FlaskConical size={24} /></div>
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Total Sample</p>
                <p className="text-xl font-black text-slate-800">{totalSampleStock} PCS</p>
            </div>
        </div>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredProducts.map((product: any) => {
           const dist = getSizeDistribution(product.id);
           return (
             <div key={product.id} className="bg-white p-6 rounded-[2rem] border border-slate-100">
                <h3 className="font-black text-slate-800">{product.name}</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {dist.map(([s, q]) => (
                    <div key={s} className="bg-slate-50 px-3 py-1 rounded-xl text-xs font-bold">{s}: {q}</div>
                  ))}
                </div>
             </div>
           );
        })}
      </div>
    </div>
  );
};
