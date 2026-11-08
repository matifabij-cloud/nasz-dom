import { Suspense } from 'react'
import { Outlet, useLocation } from 'react-router'
import { modules } from '../../modules/registry'
import { APP_NAME } from '../config'
import { Spinner } from '../ui/Spinner'
import { BottomNav } from './BottomNav'

export function AppLayout() {
  const { pathname } = useLocation()
  const current = modules.find((m) => pathname === m.path || pathname.startsWith(m.path + '/'))

  return (
    <div className="flex h-dvh flex-col">
      <header className="bg-brand-700 pt-[env(safe-area-inset-top)] text-white shadow">
        <h1 className="px-4 py-3 text-2xl font-bold">{current?.title ?? APP_NAME}</h1>
      </header>

      <main className="flex-1 overflow-y-auto overscroll-contain">
        <Suspense fallback={<Spinner />}>
          <Outlet />
        </Suspense>
      </main>

      <BottomNav />
    </div>
  )
}
