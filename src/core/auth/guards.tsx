import { Navigate, Outlet } from 'react-router'
import { Button } from '../ui/Button'
import { FullScreen, FullScreenSpinner } from '../ui/FullScreen'
import { useAuth } from './authContext'

/** Najwyższy poziom: czeka na sesję i profil, pokazuje błąd z „Spróbuj ponownie”. */
export function AuthGate() {
  const { status, refresh, signOut } = useAuth()
  if (status === 'loading') return <FullScreenSpinner />
  if (status === 'error') {
    return (
      <FullScreen title="Nie udało się wczytać danych">
        <p className="mb-5 text-stone-600">Sprawdź internet i spróbuj jeszcze raz.</p>
        <div className="space-y-3">
          <Button onClick={refresh}>Spróbuj ponownie</Button>
          <Button variant="secondary" onClick={signOut}>Wyloguj</Button>
        </div>
      </FullScreen>
    )
  }
  return <Outlet />
}

/** Logowanie i rejestracja — tylko dla niezalogowanych. */
export function RequireGuest() {
  const { status } = useAuth()
  return status === 'signed-out' ? <Outlet /> : <Navigate to="/" replace />
}

/** Wszystko inne — tylko dla zalogowanych. */
export function RequireUser() {
  const { status } = useAuth()
  return status === 'signed-out' ? <Navigate to="/logowanie" replace /> : <Outlet />
}

/** Moduły — tylko gdy ktoś należy już do domu. */
export function RequireHousehold() {
  const { household } = useAuth()
  return household ? <Outlet /> : <Navigate to="/start" replace />
}
