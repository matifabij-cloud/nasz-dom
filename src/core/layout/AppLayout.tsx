import { Suspense } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { modules } from '../../modules/registry'
import { APP_NAME } from '../config'
import { HomeIcon } from '../ui/icons'
import { Spinner } from '../ui/Spinner'
import { BottomNav } from './BottomNav'

export function AppLayout() {
  const { pathname } = useLocation()
  const current = modules.find((m) => pathname === m.path || pathname.startsWith(m.path + '/'))
  const onHouseholdPage = pathname === '/dom'
  const title = current?.title ?? (onHouseholdPage ? 'Mój dom' : APP_NAME)

  return (
    <div className="flex h-dvh flex-col">
      <header className="bg-brand-700 pt-[env(safe-area-inset-top)] text-white shadow">
        <div className="flex items-center gap-2 px-4">
          <h1 className="flex-1 truncate py-3 text-2xl font-bold">{title}</h1>
          <Link
            to="/dom"
            aria-label="Mój dom"
            className={`-mr-2 flex size-12 items-center justify-center rounded-full ${onHouseholdPage ? 'bg-white/20' : 'active:bg-white/15'}`}
          >
            <HomeIcon className="size-7" />
          </Link>
        </div>
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
