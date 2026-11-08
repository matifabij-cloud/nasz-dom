import { useAuth } from '../auth/authContext'
import { Button } from '../ui/Button'
import { InviteCodeCard } from './InviteCodeCard'
import { useMembers } from './useMembers'

/** „Mój dom”: kod zaproszenia, domownicy, wylogowanie. */
export function HouseholdPage() {
  const { household, profile, session, signOut } = useAuth()
  const members = useMembers()

  function confirmSignOut() {
    if (window.confirm('Na pewno wylogować na tym telefonie?')) signOut()
  }

  if (!household) return null

  return (
    <div className="space-y-4 p-4">
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-xl font-bold">{household.name}</h2>
        <p className="mb-4 text-stone-600">Żeby dodać kogoś z rodziny, wyślij mu ten kod.</p>
        <InviteCodeCard code={household.invite_code} />
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-xl font-bold">Domownicy</h2>
        <ul className="space-y-3">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 text-lg">
              <span className="size-5 shrink-0 rounded-full" style={{ backgroundColor: m.color }} />
              {m.display_name}
              {m.id === profile?.id && <span className="text-stone-500">(Ty)</span>}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <p className="mb-3 text-stone-600">Zalogowano jako {session?.user.email}</p>
        <Button variant="danger" onClick={confirmSignOut}>Wyloguj</Button>
      </section>
    </div>
  )
}
