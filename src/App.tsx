import { createBrowserRouter, Navigate, RouterProvider } from 'react-router'
import { AppLayout } from './core/layout/AppLayout'
import { modules } from './modules/registry'

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to={modules[0].path} replace /> },
      // Każdy moduł dostaje swoją ścieżkę (i może mieć pod nią własne podstrony).
      ...modules.map((m) => ({ path: `${m.path}/*`, element: <m.component /> })),
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
