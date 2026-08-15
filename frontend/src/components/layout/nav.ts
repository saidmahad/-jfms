import {
  LayoutDashboard,
  Fuel,
  Droplets,
  ClipboardList,
  ArrowLeftRight,
  Truck,
  Users,
  UserCog,
  Wallet,
  BarChart3,
  ShieldCheck,
  History,
  Settings,
  ShoppingCart,
  Gauge,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from '../../types/index.ts';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  match?: string[]; // paths that keep this item highlighted
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export const NAV_BY_ROLE: Record<Role, NavSection[]> = {
  ADMIN: [
    {
      title: 'Operations',
      items: [
        { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
        { label: 'New Sale', to: '/sales/new', icon: ShoppingCart, match: ['/sales/new'] },
        { label: 'Sales', to: '/sales', icon: ClipboardList },
        { label: 'Pumps', to: '/pumps', icon: Gauge },
      ],
    },
    {
      title: 'Inventory',
      items: [
        { label: 'Fuel', to: '/fuels', icon: Fuel },
        { label: 'Inventory', to: '/inventory', icon: Droplets },
        { label: 'Stock Movements', to: '/inventory/movements', icon: ArrowLeftRight },
        { label: 'Suppliers', to: '/suppliers', icon: Truck },
      ],
    },
    {
      title: 'People',
      items: [
        { label: 'Employees', to: '/employees', icon: Users },
        { label: 'Customers', to: '/customers', icon: UserCog },
      ],
    },
    {
      title: 'Finance',
      items: [
        { label: 'Expenses', to: '/expenses', icon: Wallet },
        { label: 'Reports', to: '/reports', icon: BarChart3 },
      ],
    },
    {
      title: 'Administration',
      items: [
        { label: 'Users', to: '/users', icon: ShieldCheck },
        { label: 'Audit Logs', to: '/audit-logs', icon: History },
        { label: 'Settings', to: '/settings', icon: Settings },
      ],
    },
  ],
  MANAGER: [
    {
      title: 'Operations',
      items: [
        { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
        { label: 'New Sale', to: '/sales/new', icon: ShoppingCart, match: ['/sales/new'] },
        { label: 'Sales', to: '/sales', icon: ClipboardList },
        { label: 'Pumps', to: '/pumps', icon: Gauge },
      ],
    },
    {
      title: 'Inventory',
      items: [
        { label: 'Fuel', to: '/fuels', icon: Fuel },
        { label: 'Inventory', to: '/inventory', icon: Droplets },
        { label: 'Stock Movements', to: '/inventory/movements', icon: ArrowLeftRight },
        { label: 'Suppliers', to: '/suppliers', icon: Truck },
      ],
    },
    {
      title: 'People',
      items: [
        { label: 'Employees', to: '/employees', icon: Users },
        { label: 'Customers', to: '/customers', icon: UserCog },
      ],
    },
    {
      title: 'Finance',
      items: [
        { label: 'Expenses', to: '/expenses', icon: Wallet },
        { label: 'Reports', to: '/reports', icon: BarChart3 },
      ],
    },
  ],
  ATTENDANT: [
    {
      items: [
        { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
        { label: 'My Pump', to: '/pumps', icon: Gauge },
        { label: 'New Sale', to: '/sales/new', icon: ShoppingCart, match: ['/sales/new'] },
        { label: 'My Transactions', to: '/sales', icon: ClipboardList },
        { label: 'Customers', to: '/customers', icon: UserCog },
      ],
    },
  ],
};

export function getNavForRole(role: Role): NavSection[] {
  return NAV_BY_ROLE[role] ?? NAV_BY_ROLE.ATTENDANT;
}

export const BREADCRUMB_MAP: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/sales': 'Sales',
  '/sales/new': 'New Sale',
  '/fuels': 'Fuel Management',
  '/pumps': 'Pump Management',
  '/inventory': 'Inventory',
  '/inventory/movements': 'Stock Movements',
  '/suppliers': 'Suppliers',
  '/customers': 'Customers',
  '/employees': 'Employees',
  '/expenses': 'Expenses',
  '/reports': 'Reports',
  '/users': 'Users',
  '/audit-logs': 'Audit Logs',
  '/settings': 'Settings',
  '/profile': 'Profile',
  '/notifications': 'Notifications',
};
