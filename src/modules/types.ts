import type { ComponentType, LazyExoticComponent } from 'react'

export type ModuleIcon = ComponentType<{ className?: string }>

/** Opis jednego modułu apki. Każdy moduł = folder w src/modules/ + jeden wpis w registry.ts. */
export interface AppModule {
  /** Unikalny identyfikator, np. 'shopping'. */
  id: string
  /** Krótka nazwa na dolnym pasku (max ~10 znaków). */
  name: string
  /** Tytuł w nagłówku ekranu. */
  title: string
  /** Ścieżka w adresie, np. '/zakupy'. */
  path: string
  /** Ikona na dolnym pasku. */
  icon: ModuleIcon
  /** Główny ekran modułu (ładowany dopiero przy wejściu w zakładkę). */
  component: LazyExoticComponent<ComponentType>
}
