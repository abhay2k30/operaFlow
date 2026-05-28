/**
 * ROLE PERMISSIONS — single source of truth
 *
 * Every route and nav item references this file.
 * To add a new role or change access: edit here only.
 *
 * Roles:
 *  Admin            — full access to everything
 *  InventoryManager — stock, logistics, inventory planning
 *  Procurement      — purchase orders, suppliers, inventory (read)
 *  Production       — production orders, BoM, inventory (read)
 *  Sales            — sales orders, customers, invoices
 *  Finance          — invoices, ledger, performance metrics
 *  QualityControl   — quality control, inventory (read)
 */

export const ALL_ROLES = [
  'Admin',
  'InventoryManager',
  'Procurement',
  'Production',
  'Sales',
  'Finance',
  'QualityControl',
];

/**
 * Route permission map.
 * Key = route path prefix. Value = array of roles that can access it.
 * '*' means all authenticated users.
 */
export const ROUTE_PERMISSIONS = {
  '/':                  '*',           // dashboard — all
  '/pending-actions':   '*',           // all
  '/inventory':         ['Admin', 'InventoryManager', 'Procurement', 'Production', 'QualityControl'],
  '/logistics':         ['Admin', 'InventoryManager'],
  '/purchase-orders':   ['Admin', 'Procurement'],
  '/sales':             ['Admin', 'Sales'],
  '/production':        ['Admin', 'Production'],
  '/quality':           ['Admin', 'QualityControl'],
  '/parties':           ['Admin', 'Procurement', 'Sales'],
  '/bom':               ['Admin', 'Production'],
  '/planning':          ['Admin', 'InventoryManager', 'Production', 'Procurement'],
  '/performance':       ['Admin', 'Finance', 'Procurement', 'Sales'],
  '/invoices':          ['Admin', 'Finance', 'Sales'],
  '/accounting':        ['Admin', 'Finance'],
  '/import-export':     ['Admin', 'InventoryManager'],
  '/users':             ['Admin'],
};

/**
 * Check if a role can access a given path.
 */
export function canAccess(role, path) {
  // Find the most specific matching key
  const keys = Object.keys(ROUTE_PERMISSIONS).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (path === key || (key !== '/' && path.startsWith(key))) {
      const allowed = ROUTE_PERMISSIONS[key];
      if (allowed === '*') return true;
      return role === 'Admin' || allowed.includes(role);
    }
  }
  return false;
}

/**
 * Navigation groups — each item declares which roles can see it.
 * Sidebar filters this list based on the logged-in user's role.
 */
import {
  LayoutDashboard, AlertCircle, Package, Truck, ShoppingCart,
  Tag, Factory, ClipboardCheck, Users, BookOpen, FileText,
  BarChart2, Receipt, DollarSign, Upload, Shield,
} from 'lucide-react';

export const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      {
        icon: LayoutDashboard,
        label: 'Dashboard',
        path: '/',
        roles: '*',
      },
      {
        icon: AlertCircle,
        label: 'Pending Actions',
        path: '/pending-actions',
        roles: '*',
      },
    ],
  },
  {
    label: 'Operations',
    items: [
      {
        icon: Package,
        label: 'Inventory',
        path: '/inventory',
        roles: ['Admin', 'InventoryManager', 'Procurement', 'Production', 'QualityControl'],
      },
      {
        icon: Truck,
        label: 'Logistics',
        path: '/logistics',
        roles: ['Admin', 'InventoryManager'],
      },
      {
        icon: ShoppingCart,
        label: 'Purchase Orders',
        path: '/purchase-orders',
        roles: ['Admin', 'Procurement'],
      },
      {
        icon: Tag,
        label: 'Sales Orders',
        path: '/sales',
        roles: ['Admin', 'Sales'],
      },
      {
        icon: Factory,
        label: 'Production',
        path: '/production',
        roles: ['Admin', 'Production'],
      },
      {
        icon: ClipboardCheck,
        label: 'Quality Control',
        path: '/quality',
        roles: ['Admin', 'QualityControl'],
      },
    ],
  },
  {
    label: 'Master Data',
    items: [
      {
        icon: Users,
        label: 'Parties',
        path: '/parties',
        roles: ['Admin', 'Procurement', 'Sales'],
      },
      {
        icon: BookOpen,
        label: 'Bill of Materials',
        path: '/bom',
        roles: ['Admin', 'Production'],
      },
    ],
  },
  {
    label: 'Analytics',
    items: [
      {
        icon: FileText,
        label: 'Inventory Planning',
        path: '/planning',
        roles: ['Admin', 'InventoryManager', 'Production', 'Procurement'],
      },
      {
        icon: BarChart2,
        label: 'Performance Metrics',
        path: '/performance',
        roles: ['Admin', 'Finance', 'Procurement', 'Sales'],
      },
    ],
  },
  {
    label: 'Finance',
    items: [
      {
        icon: Receipt,
        label: 'GST Invoices',
        path: '/invoices',
        roles: ['Admin', 'Finance', 'Sales'],
      },
      {
        icon: DollarSign,
        label: 'Ledger',
        path: '/accounting',
        roles: ['Admin', 'Finance'],
      },
    ],
  },
  {
    label: 'Admin',
    items: [
      {
        icon: Upload,
        label: 'Import / Export',
        path: '/import-export',
        roles: ['Admin', 'InventoryManager'],
      },
      {
        icon: Shield,
        label: 'User Management',
        path: '/users',
        roles: ['Admin'],
      },
    ],
  },
];
