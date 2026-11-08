// Typy bazy — odpowiadają supabase/migrations/. Przy zmianie migracji zaktualizuj też ten plik.

export type ShoppingCategory =
  | 'warzywa' | 'pieczywo' | 'nabial' | 'mieso' | 'mrozonki'
  | 'suche' | 'napoje' | 'chemia' | 'inne'

export type Household = {
  id: string
  name: string
  invite_code: string
  created_at: string
}

export type Profile = {
  id: string
  household_id: string | null
  display_name: string
  color: string
  created_at: string
}

export type ShoppingItem = {
  id: string
  household_id: string
  name: string
  quantity: string | null
  category: ShoppingCategory
  added_by: string | null
  is_bought: boolean
  bought_by: string | null
  bought_at: string | null
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      households: {
        Row: Household
        Insert: { name: string; invite_code: string }
        Update: { name?: string }
        Relationships: []
      }
      profiles: {
        Row: Profile
        Insert: { id: string; display_name: string }
        Update: { display_name?: string; color?: string }
        Relationships: []
      }
      shopping_items: {
        Row: ShoppingItem
        Insert: {
          id?: string
          name: string
          quantity?: string | null
          category?: ShoppingCategory
          household_id?: string
          added_by?: string
          is_bought?: boolean
        }
        Update: Partial<Omit<ShoppingItem, 'id' | 'created_at'>>
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      my_household_id: { Args: Record<string, never>; Returns: string | null }
      create_household: { Args: { p_name: string }; Returns: Household }
      join_household: { Args: { p_code: string }; Returns: Household }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
