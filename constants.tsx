
import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Layers, 
  Settings as SettingsIcon, 
  ArrowLeftRight,
  Store,
  FlaskConical,
  MapPin,
  Sliders,
  ShoppingCart,
  ReceiptText,
  Wallet,
  Banknote,
  BarChart3
} from 'lucide-react';
import { WorkflowStage } from './types';

export const WORKFLOW_ORDER: WorkflowStage[] = [
  WorkflowStage.POLA,
  WorkflowStage.POTONG,
  WorkflowStage.JAHIT,
  WorkflowStage.QC,
  WorkflowStage.STEAM,
  WorkflowStage.PACKING,
  WorkflowStage.DONE
];

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/' },
  { id: 'pos', label: 'Kasir (POS)', icon: <ShoppingCart size={20} />, path: '/pos' },
  { id: 'billing', label: 'Tagihan & Piutang', icon: <ReceiptText size={20} />, path: '/billing' },
  { id: 'reports', label: 'Laporan', icon: <BarChart3 size={20} />, path: '/reports' },
  { id: 'finished-goods', label: 'Gudang Jadi', icon: <Store size={20} />, path: '/finished-goods' },
  { id: 'sample-goods', label: 'Gudang Sample', icon: <FlaskConical size={20} />, path: '/sample-goods' },
  { id: 'mutations', label: 'Mutasi Stok', icon: <ArrowLeftRight size={20} />, path: '/mutations' },
  { id: 'production', label: 'Produksi', icon: <Layers size={20} />, path: '/production' },
  { id: 'master', label: 'Master Data', icon: <SettingsIcon size={20} />, path: '/master' },
  { id: 'settings', label: 'Pengaturan', icon: <Sliders size={20} />, path: '/settings' },
];

export const MOCK_MATERIALS = [
  { id: 'mat-1', name: 'Cotton Combed 30s', color: 'Hitam', unit: 'Kg', pricePerUnit: 110000, stock: 45 },
  { id: 'mat-2', name: 'Cotton Combed 24s', color: 'Putih', unit: 'Kg', pricePerUnit: 115000, stock: 120 },
  { id: 'mat-3', name: 'Linen', color: 'Cream', unit: 'Yard', pricePerUnit: 45000, stock: 85 },
  { id: 'mat-4', name: 'Drill', color: 'Navy', unit: 'Roll', pricePerUnit: 1250000, stock: 5 },
];

export const MOCK_ACCESSORIES = [
  { id: 'acc-1', name: 'Kancing Kemeja', size: '14L', color: 'Hitam', unit: 'Gross', pricePerUnit: 15000, stock: 10 },
  { id: 'acc-2', name: 'Resleting YKK 15cm', size: '15cm', color: 'Silver', unit: 'Pcs', pricePerUnit: 5000, stock: 200 },
];

export const MOCK_COSTS = [
  { id: 'cost-1', name: 'Listrik & Air', type: 'OPERATIONAL', cost: 1500000 },
  { id: 'cost-2', name: 'Sewa Gedung', type: 'FIXED_COST', cost: 5000000 },
  { id: 'cost-3', name: 'Gaji Admin', type: 'FIXED_COST', cost: 3500000 },
];
