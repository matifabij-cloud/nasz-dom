import { lazy } from 'react'
import type { AppModule } from './types'
import { ShoppingIcon } from './shopping/ShoppingIcon'

/**
 * Rejestr modułów. Kolejność = kolejność zakładek na dolnym pasku.
 * Pierwszy moduł otwiera się po uruchomieniu apki.
 *
 * Nowy moduł: utwórz folder src/modules/<nazwa>/ i dodaj tu jeden wpis.
 */
export const modules: AppModule[] = [
  {
    id: 'shopping',
    name: 'Zakupy',
    title: 'Lista zakupów',
    path: '/zakupy',
    icon: ShoppingIcon,
    component: lazy(() => import('./shopping/ShoppingPage')),
  },
]
