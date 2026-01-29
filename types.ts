
export enum ProductionStatus {
  PENDING = 'PENDING',
  PROSES = 'PROSES',
  SELESAI = 'SELESAI'
}

export enum WorkflowStage {
  POLA = 'POLA',
  POTONG = 'POTONG',
  JAHIT = 'JAHIT',
  QC = 'QC',
  STEAM = 'STEAM',
  PACKING = 'PACKING',
  DONE = 'SELESAI'
}

export enum SaleType {
  RETAIL = 'RETAIL',
  KONSINYASI = 'KONSINYASI',
  PUTUS = 'PUTUS'
}

export enum ProductionType {
  MASSAL = 'MASSAL',
  SAMPLE = 'SAMPLE'
}

export enum ProductionModel {
  READY_STOCK = 'READY_STOCK',
  PRE_ORDER = 'PRE_ORDER'
}

export interface Location {
  id: string;
  name: string;
  type: 'PUSAT' | 'CABANG';
  address?: string;
  consignment_margin: number;
}

export interface Product {
  id: string;
  barcode: string;
  name: string;
  category: string;
  price_retail: number;
  price_consignment_default: number;
  image_url?: string;
  material_info?: string;
  created_at?: string;
  stock?: number;
  sampleStock?: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  note?: string;
  location_id: string;
  created_at?: string;
}

export interface Inventory {
  id: string;
  product_id: string;
  location_id: string;
  color: string;
  size?: string;
  qty: number;
}

export interface Sale {
  id: string;
  date: string;
  location_id: string;
  customer_name: string;
  total_price: number;
  total_consignment: number;
  payment_method: string;
  status: 'PAID' | 'UNPAID';
  sales_source?: string;
  items: string; // JSON String
  paid_amount: number;
  remaining_amount: number;
  discount_note?: string;
}

export interface Material {
  id: string;
  name: string;
  color: string;
  unit: string;
  stock: number;
  price_per_unit: number; 
}

export interface Accessory {
  id: string;
  name: string;
  color: string;
  size: string;
  unit: string;
  stock: number;
  price_per_unit: number; 
}

export interface MaterialUsage {
  materialId: string;
  qty: number;
  snapshotPrice: number;
}

export interface AccessoryUsage {
  accessoryId: string;
  qty: number;
  snapshotPrice: number;
}

export interface SizeTarget {
  size: string;
  targetQty: number;
  resultQty: number;
}

export interface ProductionBatch {
  id: string;
  product_id: string; 
  code: string;
  variant_color: string; 
  type: ProductionType;
  model: ProductionModel;
  status: ProductionStatus;
  current_stage: WorkflowStage; 
  progress: number;
  target: number;
  actual_output?: number; 
  start_date: string; 
  end_date?: string; 
  res_qc?: number;
  res_pola?: number;
  res_potong?: number;
  res_jahit?: number;
  res_steam?: number;
  res_packing?: number;
  materials_used?: string; 
  accessories_used?: string; 
  targets?: string;
  sewing_cost?: number; 
  other_costs?: string; 
  total_cost?: number; 
}