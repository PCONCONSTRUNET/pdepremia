import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { ProtectedRoute, AdminRoute, GuestRoute } from './guards'
import { LoadingPage } from '@/components/common/Loading'
import { ErrorPage } from '@/pages/public/ErrorPage'

// ─── Public Pages ─────────────────────────────────────────────────────────────
const Home = lazy(() => import('@/pages/public/Home'))

const Checkout = lazy(() => import('@/pages/public/Checkout'))
const MyTickets = lazy(() => import('@/pages/public/MyTickets'))
const MyPrizes = lazy(() => import('@/pages/public/MyPrizes'))
const Winners = lazy(() => import('@/pages/public/Winners'))
const Ranks = lazy(() => import('@/pages/public/Ranks'))
const Transparency = lazy(() => import('@/pages/public/Transparency'))
const Terms = lazy(() => import('@/pages/public/Terms'))
const Privacy = lazy(() => import('@/pages/public/Privacy'))
const Profile = lazy(() => import('@/pages/public/Profile'))
const WheelTest = lazy(() => import('@/pages/public/WheelTest'))
const DailyWheel = lazy(() => import('@/pages/public/DailyWheel'))
const OpenBox = lazy(() => import('@/pages/public/OpenBox'))
const Boxes = lazy(() => import('@/pages/public/Boxes'))
const Double = lazy(() => import('@/pages/public/Double'))
const Mines = lazy(() => import('@/pages/public/Mines'))
const Sorteios = lazy(() => import('@/pages/public/Sorteios/index'))
const Favoritos = lazy(() => import('@/pages/public/Favoritos'))

// ─── Auth Pages ───────────────────────────────────────────────────────────────
const Login = lazy(() => import('@/pages/public/Auth/Login'))
const Register = lazy(() => import('@/pages/public/Auth/Register'))
const ForgotPassword = lazy(() => import('@/pages/public/Auth/ForgotPassword'))

// ─── Admin Pages ──────────────────────────────────────────────────────────────
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'))
const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard'))

const AdminPayments = lazy(() => import('@/pages/admin/Payments'))
const AdminWithdrawals = lazy(() => import('@/pages/admin/Withdrawals'))
const AdminPrizes = lazy(() => import('@/pages/admin/Prizes'))
const AdminWinners = lazy(() => import('@/pages/admin/Winners'))
const AdminUsers = lazy(() => import('@/pages/admin/Users'))
const AdminUserDetail = lazy(() => import('@/pages/admin/UserDetail'))
const AdminAuditLogs = lazy(() => import('@/pages/admin/AuditLogs'))
const AdminSettings = lazy(() => import('@/pages/admin/Settings'))
const AdminGateways = lazy(() => import('@/pages/admin/Gateways'))
const AdminWheels = lazy(() => import('@/pages/admin/Wheels'))
const AdminWheelForm = lazy(() => import('@/pages/admin/WheelForm'))
const AdminBoxes = lazy(() => import('@/pages/admin/Boxes'))
const AdminRewards = lazy(() => import('@/pages/admin/Rewards'))
const AdminDailyWheel = lazy(() => import('@/pages/admin/DailyWheelAdmin'))
const AdminSorteios = lazy(() => import('@/pages/admin/Sorteios/index'))
const AdminSorteioForm = lazy(() => import('@/pages/admin/Sorteios/Form'))
const AdminSupport = lazy(() => import('@/pages/admin/Support'))

function Fallback() {
  return <LoadingPage />
}

const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    errorElement: <ErrorPage />,
    children: [
      // Public routes
      { path: '/', element: <Suspense fallback={<Fallback />}><Home /></Suspense> },

      { path: '/ganhadores', element: <Suspense fallback={<Fallback />}><Winners /></Suspense> },
      { path: '/ranks', element: <Suspense fallback={<Fallback />}><Ranks /></Suspense> },
      { path: '/transparencia', element: <Suspense fallback={<Fallback />}><Transparency /></Suspense> },
      { path: '/termos', element: <Suspense fallback={<Fallback />}><Terms /></Suspense> },
      { path: '/privacidade', element: <Suspense fallback={<Fallback />}><Privacy /></Suspense> },

      { path: '/boxes', element: <Suspense fallback={<Fallback />}><Boxes /></Suspense> },
      { path: '/double', element: <Suspense fallback={<Fallback />}><Double /></Suspense> },
      { path: '/mines', element: <Suspense fallback={<Fallback />}><Mines /></Suspense> },
      { path: '/sorteios', element: <Suspense fallback={<Fallback />}><Sorteios /></Suspense> },

      // Auth routes (guests only)
      {
        element: <GuestRoute />,
        children: [
          { path: '/login', element: <Suspense fallback={<Fallback />}><Login /></Suspense> },
          { path: '/cadastro', element: <Suspense fallback={<Fallback />}><Register /></Suspense> },
          { path: '/esqueci-senha', element: <Suspense fallback={<Fallback />}><ForgotPassword /></Suspense> },
        ],
      },

      // Protected routes (auth required)
      {
        element: <ProtectedRoute />,
        children: [
          { path: '/perfil', element: <Suspense fallback={<Fallback />}><Profile /></Suspense> },
          { path: '/favoritos', element: <Suspense fallback={<Fallback />}><Favoritos /></Suspense> },
          { path: '/roleta-diaria', element: <Suspense fallback={<Fallback />}><DailyWheel /></Suspense> },
          { path: '/checkout/:orderId', element: <Suspense fallback={<Fallback />}><Checkout /></Suspense> },
          { path: '/abrir-box/:orderId', element: <Suspense fallback={<Fallback />}><OpenBox /></Suspense> },
          { path: '/meus-bilhetes', element: <Suspense fallback={<Fallback />}><MyTickets /></Suspense> },
          { path: '/meus-premios', element: <Suspense fallback={<Fallback />}><MyPrizes /></Suspense> },
        ],
      },
    ],
  },

  // Admin routes (separate layout, own auth guard)
  {
    element: <AdminRoute />,
    children: [
      {
        element: <Suspense fallback={<Fallback />}><AdminLayout /></Suspense>,
        children: [
          { path: '/admin', element: <Suspense fallback={<Fallback />}><AdminDashboard /></Suspense> },

          { path: '/admin/pagamentos', element: <Suspense fallback={<Fallback />}><AdminPayments /></Suspense> },
          { path: '/admin/saques', element: <Suspense fallback={<Fallback />}><AdminWithdrawals /></Suspense> },
          { path: '/admin/premios', element: <Suspense fallback={<Fallback />}><AdminPrizes /></Suspense> },
          { path: '/admin/ganhadores', element: <Suspense fallback={<Fallback />}><AdminWinners /></Suspense> },
          { path: '/admin/usuarios', element: <Suspense fallback={<Fallback />}><AdminUsers /></Suspense> },
          { path: '/admin/usuarios/:id', element: <Suspense fallback={<Fallback />}><AdminUserDetail /></Suspense> },
          { path: '/admin/auditoria', element: <Suspense fallback={<Fallback />}><AdminAuditLogs /></Suspense> },
          { path: '/admin/configuracoes', element: <Suspense fallback={<Fallback />}><AdminSettings /></Suspense> },
          { path: '/admin/gateways', element: <Suspense fallback={<Fallback />}><AdminGateways /></Suspense> },
          { path: '/admin/recompensas', element: <Suspense fallback={<Fallback />}><AdminRewards /></Suspense> },
          { path: '/admin/boxes', element: <Suspense fallback={<Fallback />}><AdminBoxes /></Suspense> },
          { path: '/admin/roleta-diaria', element: <Suspense fallback={<Fallback />}><AdminDailyWheel /></Suspense> },
          { path: '/admin/sorteios', element: <Suspense fallback={<Fallback />}><AdminSorteios /></Suspense> },
          { path: '/admin/sorteios/novo', element: <Suspense fallback={<Fallback />}><AdminSorteioForm /></Suspense> },
          { path: '/admin/sorteios/:id', element: <Suspense fallback={<Fallback />}><AdminSorteioForm /></Suspense> },
          { path: '/admin/suporte', element: <Suspense fallback={<Fallback />}><AdminSupport /></Suspense> },
        ],
      },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
