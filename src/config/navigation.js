// Sidebar and account menu items. Each item has an `access` rule from ROUTE_ACCESS;
// layouts show only the items the current user can open.
import {
  Ban,
  Building2,
  CalendarDays,
  ChartColumn,
  Coins,
  FileText,
  Flag,
  FolderTree,
  Landmark,
  LayoutDashboard,
  MapPin,
  MessageSquareWarning,
  Package,
  Percent,
  Settings,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Star,
  Store,
  Truck,
  User,
  UserCheck,
  Users,
  UserX,
} from 'lucide-react'
import { ROUTE_ACCESS } from './permissions'

export const CUSTOMER_NAV = [
  { to: '/orders', label: 'My orders', icon: ShoppingBag },
  { to: '/complaints', label: 'Complaints', icon: MessageSquareWarning },
  { to: '/account/profile', label: 'Profile', icon: User },
  { to: '/account/addresses', label: 'Addresses', icon: MapPin },
]

// Grouped for the sidebar. `end: true` makes the link active only on the exact path.
export const MERCHANT_NAV = [
  {
    title: 'Overview',
    items: [
      { to: '/merchant', label: 'Dashboard', icon: LayoutDashboard, access: ROUTE_ACCESS.merchantDashboard, end: true },
      { to: '/merchant/metrics', label: 'Metrics', icon: ChartColumn, access: ROUTE_ACCESS.merchantMetrics },
    ],
  },
  {
    title: 'Sales',
    items: [
      { to: '/merchant/orders', label: 'Orders', icon: ShoppingBag, access: ROUTE_ACCESS.merchantOrders },
      { to: '/merchant/complaints', label: 'Complaints', icon: MessageSquareWarning, access: ROUTE_ACCESS.merchantComplaints },
      { to: '/merchant/customer-blocks', label: 'Blocked customers', icon: UserX, access: ROUTE_ACCESS.merchantCustomerBlocks },
    ],
  },
  {
    title: 'Catalog',
    items: [
      { to: '/merchant/products', label: 'Products', icon: Package, access: ROUTE_ACCESS.merchantProducts },
      { to: '/merchant/discounts', label: 'Discounts', icon: Percent, access: ROUTE_ACCESS.merchantDiscounts },
      { to: '/merchant/reviews', label: 'Reviews', icon: Star, access: ROUTE_ACCESS.merchantReviews },
    ],
  },
  {
    title: 'Store setup',
    items: [
      { to: '/merchant/store', label: 'Store profile', icon: Store, access: ROUTE_ACCESS.merchantStore },
      { to: '/merchant/bank-accounts', label: 'Bank accounts', icon: Landmark, access: ROUTE_ACCESS.merchantBankAccounts },
      { to: '/merchant/shipping', label: 'Couriers and shipping', icon: Truck, access: ROUTE_ACCESS.merchantShipping },
      { to: '/merchant/assistants', label: 'Assistants', icon: Users, access: ROUTE_ACCESS.merchantAssistants },
      { to: '/merchant/application', label: 'Application', icon: FileText, access: ROUTE_ACCESS.merchantApplication },
    ],
  },
]

export const ADMIN_NAV = [
  {
    title: 'Overview',
    items: [{ to: '/admin', label: 'Dashboard', icon: LayoutDashboard, access: ROUTE_ACCESS.admin, end: true }],
  },
  {
    title: 'People',
    items: [
      { to: '/admin/merchants/pending', label: 'Pending merchants', icon: UserCheck, access: ROUTE_ACCESS.admin },
      { to: '/admin/users', label: 'Users', icon: Users, access: ROUTE_ACCESS.admin },
    ],
  },
  {
    title: 'Stores',
    items: [
      { to: '/admin/stores', label: 'Stores', icon: Store, access: ROUTE_ACCESS.admin },
      { to: '/admin/at-risk', label: 'At-risk merchants', icon: ShieldAlert, access: ROUTE_ACCESS.admin },
      { to: '/admin/reviews', label: 'Reviews', icon: Star, access: ROUTE_ACCESS.admin },
    ],
  },
  {
    title: 'Orders',
    items: [
      { to: '/admin/orders', label: 'Orders', icon: ShoppingBag, access: ROUTE_ACCESS.admin },
      { to: '/admin/complaints', label: 'Complaints', icon: MessageSquareWarning, access: ROUTE_ACCESS.admin },
      { to: '/admin/flagged-references', label: 'Flagged references', icon: Flag, access: ROUTE_ACCESS.admin },
      { to: '/admin/cod-objections', label: 'COD objections', icon: Ban, access: ROUTE_ACCESS.admin },
    ],
  },
  {
    title: 'Master data',
    items: [
      { to: '/admin/categories', label: 'Categories', icon: FolderTree, access: ROUTE_ACCESS.admin },
      { to: '/admin/banks', label: 'Banks', icon: Building2, access: ROUTE_ACCESS.admin },
      { to: '/admin/couriers', label: 'Couriers', icon: Truck, access: ROUTE_ACCESS.admin },
    ],
  },
  {
    title: 'Super admin',
    items: [
      { to: '/admin/admins', label: 'Admins', icon: ShieldCheck, access: ROUTE_ACCESS.superAdmin },
      { to: '/admin/settings', label: 'Settings', icon: Settings, access: ROUTE_ACCESS.superAdmin },
      { to: '/admin/holidays', label: 'Holidays', icon: CalendarDays, access: ROUTE_ACCESS.superAdmin },
      { to: '/admin/credits', label: 'Credits', icon: Coins, access: ROUTE_ACCESS.superAdmin },
    ],
  },
]

// Keeps only groups/items the user can open; drops empty groups.
export function filterNav(groups, canOpen) {
  return groups
    .map((group) => ({ ...group, items: group.items.filter((item) => canOpen(item.access)) }))
    .filter((group) => group.items.length > 0)
}
