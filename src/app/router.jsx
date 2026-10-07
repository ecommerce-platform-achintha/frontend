// All routes. Layouts render <Outlet />; ProtectedRoute guards groups or single pages.
import { createBrowserRouter } from 'react-router-dom'
import { MERCHANT_SIDE, ROUTE_ACCESS } from '@/config/permissions'
import AppRoot from './AppRoot'
import RouteErrorPage from './RouteErrorPage'

import ProtectedRoute from '@/components/common/ProtectedRoute'
import AdminLayout from '@/components/layout/AdminLayout'
import AuthLayout from '@/components/layout/AuthLayout'
import CustomerLayout from '@/components/layout/CustomerLayout'
import MerchantLayout from '@/components/layout/MerchantLayout'
import PublicLayout from '@/components/layout/PublicLayout'

// Auth and shared
import ChangePasswordPage from '@/pages/auth/ChangePasswordPage'
import LoginPage from '@/pages/auth/LoginPage'
import RegisterCustomerPage from '@/pages/auth/RegisterCustomerPage'
import RegisterMerchantPage from '@/pages/auth/RegisterMerchantPage'
import ForbiddenPage from '@/pages/shared/ForbiddenPage'
import NotFoundPage from '@/pages/shared/NotFoundPage'

// Public
import HomePage from '@/pages/public/HomePage'
import ProductPage from '@/pages/public/ProductPage'
import SearchPage from '@/pages/public/SearchPage'
import StorePage from '@/pages/public/StorePage'
import StoresPage from '@/pages/public/StoresPage'

// Customer
import AddressesPage from '@/pages/customer/AddressesPage'
import CartPage from '@/pages/customer/CartPage'
import CheckoutPage from '@/pages/customer/CheckoutPage'
import ComplaintDetailPage from '@/pages/customer/ComplaintDetailPage'
import ComplaintsPage from '@/pages/customer/ComplaintsPage'
import OrderDetailPage from '@/pages/customer/OrderDetailPage'
import OrdersPage from '@/pages/customer/OrdersPage'
import ProfilePage from '@/pages/customer/ProfilePage'

// Merchant
import MerchantApplicationPage from '@/pages/merchant/MerchantApplicationPage'
import MerchantAssistantsPage from '@/pages/merchant/MerchantAssistantsPage'
import MerchantBankAccountsPage from '@/pages/merchant/MerchantBankAccountsPage'
import MerchantComplaintsPage from '@/pages/merchant/MerchantComplaintsPage'
import MerchantCustomerBlocksPage from '@/pages/merchant/MerchantCustomerBlocksPage'
import MerchantDashboardPage from '@/pages/merchant/MerchantDashboardPage'
import MerchantDiscountsPage from '@/pages/merchant/MerchantDiscountsPage'
import MerchantMetricsPage from '@/pages/merchant/MerchantMetricsPage'
import MerchantOrderDetailPage from '@/pages/merchant/MerchantOrderDetailPage'
import MerchantOrdersPage from '@/pages/merchant/MerchantOrdersPage'
import MerchantProductCreatePage from '@/pages/merchant/MerchantProductCreatePage'
import MerchantProductDetailPage from '@/pages/merchant/MerchantProductDetailPage'
import MerchantProductsPage from '@/pages/merchant/MerchantProductsPage'
import MerchantReviewsPage from '@/pages/merchant/MerchantReviewsPage'
import MerchantShippingPage from '@/pages/merchant/MerchantShippingPage'
import MerchantStorePage from '@/pages/merchant/MerchantStorePage'

// Admin
import AdminAdminsPage from '@/pages/admin/AdminAdminsPage'
import AdminAtRiskPage from '@/pages/admin/AdminAtRiskPage'
import AdminBanksPage from '@/pages/admin/AdminBanksPage'
import AdminCategoriesPage from '@/pages/admin/AdminCategoriesPage'
import AdminCodObjectionsPage from '@/pages/admin/AdminCodObjectionsPage'
import AdminComplaintsPage from '@/pages/admin/AdminComplaintsPage'
import AdminCouriersPage from '@/pages/admin/AdminCouriersPage'
import AdminCreditsPage from '@/pages/admin/AdminCreditsPage'
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage'
import AdminFlaggedReferencesPage from '@/pages/admin/AdminFlaggedReferencesPage'
import AdminHolidaysPage from '@/pages/admin/AdminHolidaysPage'
import AdminOrderDetailPage from '@/pages/admin/AdminOrderDetailPage'
import AdminOrdersPage from '@/pages/admin/AdminOrdersPage'
import AdminPendingMerchantsPage from '@/pages/admin/AdminPendingMerchantsPage'
import AdminReviewsPage from '@/pages/admin/AdminReviewsPage'
import AdminSettingsPage from '@/pages/admin/AdminSettingsPage'
import AdminStoreDetailPage from '@/pages/admin/AdminStoreDetailPage'
import AdminStoresPage from '@/pages/admin/AdminStoresPage'
import AdminUserDetailPage from '@/pages/admin/AdminUserDetailPage'
import AdminUsersPage from '@/pages/admin/AdminUsersPage'

// Wraps one page in a guard: guard(ROUTE_ACCESS.merchantOrders, <MerchantOrdersPage />)
const guard = (access, element) => <ProtectedRoute {...access}>{element}</ProtectedRoute>

const A = ROUTE_ACCESS

export const router = createBrowserRouter([
  {
    element: <AppRoot />,
    errorElement: <RouteErrorPage />,
    children: [
      // Sign in / sign up (centered card layout)
      {
        element: <AuthLayout />,
        children: [
          { path: 'login', element: <LoginPage /> },
          { path: 'register', element: <RegisterCustomerPage /> },
          { path: 'register/merchant', element: <RegisterMerchantPage /> },
          // Needs a session but NOT the "must change password" redirect, so it guards itself.
          { path: 'change-password', element: <ChangePasswordPage /> },
        ],
      },

      // Shop
      {
        element: <PublicLayout />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'search', element: <SearchPage /> },
          { path: 'products/:publicId', element: <ProductPage /> },
          { path: 'stores', element: <StoresPage /> },
          { path: 'stores/:publicId', element: <StorePage /> },

          // Customer only
          {
            element: <ProtectedRoute {...A.customer} />,
            children: [
              { path: 'cart', element: <CartPage /> },
              { path: 'checkout', element: <CheckoutPage /> },
              {
                element: <CustomerLayout />,
                children: [
                  { path: 'orders', element: <OrdersPage /> },
                  { path: 'orders/:publicId', element: <OrderDetailPage /> },
                  { path: 'account/profile', element: <ProfilePage /> },
                  { path: 'account/addresses', element: <AddressesPage /> },
                  { path: 'complaints', element: <ComplaintsPage /> },
                  { path: 'complaints/:publicId', element: <ComplaintDetailPage /> },
                ],
              },
            ],
          },

          { path: '403', element: <ForbiddenPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },

      // Seller center (merchant owner + assistants; each page checks its own permission)
      {
        path: 'merchant',
        element: <ProtectedRoute roles={MERCHANT_SIDE} />,
        children: [
          {
            element: <MerchantLayout />,
            children: [
              { index: true, element: guard(A.merchantDashboard, <MerchantDashboardPage />) },
              { path: 'application', element: guard(A.merchantApplication, <MerchantApplicationPage />) },
              { path: 'orders', element: guard(A.merchantOrders, <MerchantOrdersPage />) },
              { path: 'orders/:publicId', element: guard(A.merchantOrders, <MerchantOrderDetailPage />) },
              { path: 'complaints', element: guard(A.merchantComplaints, <MerchantComplaintsPage />) },
              { path: 'products', element: guard(A.merchantProducts, <MerchantProductsPage />) },
              { path: 'products/new', element: guard(A.merchantProductCreate, <MerchantProductCreatePage />) },
              { path: 'products/:publicId', element: guard(A.merchantProducts, <MerchantProductDetailPage />) },
              { path: 'discounts', element: guard(A.merchantDiscounts, <MerchantDiscountsPage />) },
              { path: 'reviews', element: guard(A.merchantReviews, <MerchantReviewsPage />) },
              { path: 'customer-blocks', element: guard(A.merchantCustomerBlocks, <MerchantCustomerBlocksPage />) },
              { path: 'store', element: guard(A.merchantStore, <MerchantStorePage />) },
              { path: 'bank-accounts', element: guard(A.merchantBankAccounts, <MerchantBankAccountsPage />) },
              { path: 'shipping', element: guard(A.merchantShipping, <MerchantShippingPage />) },
              { path: 'assistants', element: guard(A.merchantAssistants, <MerchantAssistantsPage />) },
              { path: 'metrics', element: guard(A.merchantMetrics, <MerchantMetricsPage />) },
              { path: '*', element: <NotFoundPage /> },
            ],
          },
        ],
      },

      // Admin console (admin + super admin; the last five pages are super admin only)
      {
        path: 'admin',
        element: <ProtectedRoute {...A.admin} />,
        children: [
          {
            element: <AdminLayout />,
            children: [
              { index: true, element: <AdminDashboardPage /> },
              { path: 'merchants/pending', element: <AdminPendingMerchantsPage /> },
              { path: 'users', element: <AdminUsersPage /> },
              { path: 'users/:publicId', element: <AdminUserDetailPage /> },
              { path: 'stores', element: <AdminStoresPage /> },
              { path: 'stores/:publicId', element: <AdminStoreDetailPage /> },
              { path: 'at-risk', element: <AdminAtRiskPage /> },
              { path: 'orders', element: <AdminOrdersPage /> },
              { path: 'orders/:publicId', element: <AdminOrderDetailPage /> },
              { path: 'complaints', element: <AdminComplaintsPage /> },
              { path: 'flagged-references', element: <AdminFlaggedReferencesPage /> },
              { path: 'cod-objections', element: <AdminCodObjectionsPage /> },
              { path: 'categories', element: <AdminCategoriesPage /> },
              { path: 'reviews', element: <AdminReviewsPage /> },
              { path: 'banks', element: <AdminBanksPage /> },
              { path: 'couriers', element: <AdminCouriersPage /> },
              { path: 'admins', element: guard(A.superAdmin, <AdminAdminsPage />) },
              { path: 'settings', element: guard(A.superAdmin, <AdminSettingsPage />) },
              { path: 'holidays', element: guard(A.superAdmin, <AdminHolidaysPage />) },
              { path: 'credits', element: guard(A.superAdmin, <AdminCreditsPage />) },
              { path: '*', element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },
])
