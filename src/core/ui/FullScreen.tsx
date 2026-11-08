import type { ReactNode } from 'react'
import { APP_NAME } from '../config'
import { Spinner } from './Spinner'
import { HomeIcon } from './icons'

/** Ekran bez dolnej nawigacji (logowanie, rejestracja, zakładanie domu). */
export function FullScreen({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-stone-100 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div className="bg-brand-700 px-4 pt-[max(2rem,env(safe-area-inset-top))] pb-16 text-center text-white">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-white/15">
          <HomeIcon className="size-10" />
        </div>
        <p className="mt-2 text-2xl font-bold">{APP_NAME}</p>
      </div>
      <div className="mx-auto -mt-10 max-w-md px-4">
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h1 className="mb-5 text-2xl font-bold">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  )
}

export function FullScreenSpinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Spinner />
    </div>
  )
}
