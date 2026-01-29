
import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string, defaultValue: string): string => {
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key] as string;
    }
    return defaultValue;
  } catch (e) {
    return defaultValue;
  }
};

const supabaseUrl = getEnv('SUPABASE_URL', 'https://mfxrxoajwyoytadoylpj.supabase.co');
const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1meHJ4b2Fqd3lveXRhZG95bHBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NTk5MTQsImV4cCI6MjA4NTEzNTkxNH0.tkXtCgBLkr8TcsPzuEQSHhjfsruak-JbynIpC4d5fiM');

let supabaseClient: any = null;

try {
  if (supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true },
      global: { headers: { 'x-application-name': 'nuppu-pos' } }
    });
  }
} catch (e) {
  console.error("Supabase Init Fatal Error:", e);
}

export const supabase = supabaseClient || {
  from: (table: string) => ({
    select: () => ({ 
      eq: () => ({ single: async () => ({ data: null, error: new Error("DB_OFFLINE") }) }),
      order: () => Promise.resolve({ data: [], error: new Error("DB_OFFLINE") }) 
    }),
    upsert: async () => ({ data: null, error: new Error("DB_OFFLINE") }),
    insert: async () => ({ data: null, error: new Error("DB_OFFLINE") }),
    update: () => ({ eq: async () => ({ data: null, error: new Error("DB_OFFLINE") }) }),
    delete: () => ({ eq: async () => ({ data: null, error: new Error("DB_OFFLINE") }) })
  })
};

export const isSupabaseConfigured = () => !!supabaseClient;

const handleResponse = async (promise: Promise<any>) => {
  try {
    const { data, error } = await promise;
    if (error) return { data: null, error };
    return { data, error: null };
  } catch (e: any) {
    return { data: null, error: { message: e.message } };
  }
};

export const db = {
  users: {
    loginManual: async (email: string, pass: string) => handleResponse(supabase.from('Pengguna').select('*').eq('email', email).eq('password', pass).single()),
    getAll: async () => handleResponse(supabase.from('Pengguna').select('*').order('name')),
    create: async (data: any) => handleResponse(supabase.from('Pengguna').insert(data)),
    update: async (id: string, data: any) => handleResponse(supabase.from('Pengguna').update(data).eq('id', id))
  },
  products: {
    getAll: async () => handleResponse(supabase.from('Produk').select('*').order('name')),
    upsert: async (data: any) => handleResponse(supabase.from('Produk').upsert(data)),
    delete: async (id: string) => handleResponse(supabase.from('Produk').delete().eq('id', id))
  },
  locations: {
    getAll: async () => handleResponse(supabase.from('Lokasi').select('*').order('name')),
    upsert: async (data: any) => handleResponse(supabase.from('Lokasi').upsert(data)),
    delete: async (id: string) => handleResponse(supabase.from('Lokasi').delete().eq('id', id))
  },
  customers: {
    getAll: async () => handleResponse(supabase.from('Pelanggan').select('*').order('name')),
    upsert: async (data: any) => handleResponse(supabase.from('Pelanggan').upsert(data)),
    delete: async (id: string) => handleResponse(supabase.from('Pelanggan').delete().eq('id', id))
  },
  materials: {
    getAll: async () => handleResponse(supabase.from('Bahan').select('*').order('name')),
    upsert: async (data: any) => handleResponse(supabase.from('Bahan').upsert(data)),
    // Fix: Added missing delete method for materials
    delete: async (id: string) => handleResponse(supabase.from('Bahan').delete().eq('id', id)),
    updateStock: async (id: string, delta: number) => {
      const { data: current } = await supabase.from('Bahan').select('stock').eq('id', id).single();
      return handleResponse(supabase.from('Bahan').update({ stock: (Number(current?.stock) || 0) + delta }).eq('id', id));
    }
  },
  accessories: {
    getAll: async () => handleResponse(supabase.from('Aksesoris').select('*').order('name')),
    upsert: async (data: any) => handleResponse(supabase.from('Aksesoris').upsert(data)),
    // Fix: Added missing delete method for accessories
    delete: async (id: string) => handleResponse(supabase.from('Aksesoris').delete().eq('id', id)),
    updateStock: async (id: string, delta: number) => {
      const { data: current } = await supabase.from('Aksesoris').select('stock').eq('id', id).single();
      return handleResponse(supabase.from('Aksesoris').update({ stock: (Number(current?.stock) || 0) + delta }).eq('id', id));
    }
  },
  production: {
    getAll: async () => handleResponse(supabase.from('Produksi').select('*').order('start_date', { ascending: false })),
    upsert: async (data: any) => handleResponse(supabase.from('Produksi').upsert(data)),
    update: async (id: string, data: any) => handleResponse(supabase.from('Produksi').update(data).eq('id', id))
  },
  inventory: {
    getAll: async () => handleResponse(supabase.from('StokUnit').select('*')),
    adjustStock: async (productId: string, locationId: string, color: string, size: string, delta: number) => {
      // 1. Cari record yang ada
      const { data: existing } = await supabase.from('StokUnit')
        .select('*')
        .eq('product_id', productId)
        .eq('location_id', locationId)
        .eq('color', color)
        .eq('size', size)
        .single();

      if (existing) {
        // 2. Jika ada, update qty
        return handleResponse(supabase.from('StokUnit')
          .update({ qty: (Number(existing.qty) || 0) + delta })
          .eq('id', existing.id));
      } else {
        // 3. Jika tidak ada, insert baru (hanya jika delta positif/penambahan, atau tetap buat jika pengurangan)
        return handleResponse(supabase.from('StokUnit')
          .insert({
            id: `STK${Date.now()}${Math.floor(Math.random()*1000)}`,
            product_id: productId,
            location_id: locationId,
            color: color,
            size: size,
            qty: delta
          }));
      }
    }
  },
  mutations: {
    getAll: async () => handleResponse(supabase.from('Mutasi').select('*').order('date', { ascending: false })),
    create: async (data: any) => handleResponse(supabase.from('Mutasi').insert(data))
  },
  sales: {
    getAll: async () => handleResponse(supabase.from('Penjualan').select('*').order('date', { ascending: false })),
    create: async (data: any) => handleResponse(supabase.from('Penjualan').insert(data)),
    update: async (id: string, data: any) => handleResponse(supabase.from('Penjualan').update(data).eq('id', id))
  },
  settlements: {
    getAll: async () => handleResponse(supabase.from('SetoranCabang').select('*').order('date', { ascending: false })),
    create: async (data: any) => handleResponse(supabase.from('SetoranCabang').insert(data))
  }
};
