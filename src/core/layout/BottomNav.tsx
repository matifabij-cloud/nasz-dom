import { NavLink } from 'react-router'
import { modules } from '../../modules/registry'

/** Dolny pasek zakładek — budowany automatycznie z rejestru modułów. */
export function BottomNav() {
  return (
    <nav
      className="border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)] select-none"
      aria-label="Moduły"
    >
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${modules.length}, minmax(0, 1fr))` }}>
        {modules.map((m) => (
          <li key={m.id}>
            <NavLink
              to={m.path}
              className={({ isActive }) =>
                `flex min-h-16 flex-col items-center justify-center gap-0.5 py-2 text-sm font-medium ${
                  isActive ? 'text-brand-700' : 'text-stone-500 active:bg-stone-100'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`rounded-full px-4 py-1 ${isActive ? 'bg-brand-100' : ''}`}>
                    <m.icon className="size-6" />
                  </span>
                  {m.name}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
