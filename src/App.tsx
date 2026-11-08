import { createBrowserRouter, Navigate, RouterProvider } from 'react-router'
import { AuthProvider } from './core/auth/AuthProvider'
import { AuthGate, RequireGuest, RequireHousehold, RequireUser } from './core/auth/guards'
import { LoginPage } from './core/auth/LoginPage'
import { RegisterPage } from './core/auth/RegisterPage'
import { HouseholdPage } from './core/household/HouseholdPage'
import { HouseholdSetupPage } from './core/household/HouseholdSetupPage'
import { AppLayout } from './core/layout/AppLayout'
import { modules } from './modules/registry'

const router = createBrowserRouter([
  {
    element: <AuthGate />,
    children: [
      {
        element: <RequireGuest />,
        children: [
          { path: '/logowanie', element: <LoginPage /> },
          { path: '/rejestracja', element: <RegisterPage /> },
        ],
      },
      {
        element: <RequireUser />,
        children: [
          { path: '/start', element: <HouseholdSetupPage /> },
          {
            element: <RequireHousehold />,
            children: [
              {
                path: '/',
                element: <AppLayout />,
                children: [
                  { index: true, element: <Navigate to={modules[0].path} replace /> },
                  // Każdy moduł dostaje swoją ścieżkę (i może mieć pod nią własne podstrony).
                  ...modules.map((m) => ({ path: `${m.path}/*`, element: <m.component /> })),
                  { path: 'dom', element: <HouseholdPage /> },
                  { path: '*', element: <Navigate to="/" replace /> },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
])

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}
