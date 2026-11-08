import { useEffect, useState } from 'react'
import { useAuth } from '../auth/authContext'
import { readJSON, writeJSON } from '../storage'
import { supabase } from '../supabase/client'
import type { Profile } from '../supabase/database.types'

export type Member = Pick<Profile, 'id' | 'display_name' | 'color'>

/** Domownicy (imię + kolor) — do kropek „kto dodał” i ekranu „Mój dom”. */
export function useMembers() {
  const { household } = useAuth()
  const cacheKey = `members:${household?.id}`
  const [members, setMembers] = useState<Member[]>(() => readJSON<Member[]>(cacheKey) ?? [])

  useEffect(() => {
    if (!household) return
    let active = true
    supabase
      .from('profiles')
      .select('id, display_name, color')
      .eq('household_id', household.id)
      .order('created_at')
      .then(({ data }) => {
        if (active && data) {
          setMembers(data)
          writeJSON(cacheKey, data)
        }
      })
    return () => {
      active = false
    }
  }, [household, cacheKey])

  return members
}
