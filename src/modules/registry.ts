import { lazy } from 'react'
import type { AppModule } from './types'
import { ShoppingIcon } from './shopping/ShoppingIcon'
import { TasksIcon } from './tasks/TasksIcon'

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
  {
    id: 'tasks',
    name: 'Sprawy',
    title: 'Sprawy do załatwienia',
    path: '/sprawy',
    icon: TasksIcon,
    component: lazy(() => import('./tasks/TasksPage')),
  },
]
