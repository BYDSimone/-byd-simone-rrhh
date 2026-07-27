'use client'

import { createContext, useContext } from 'react'
import type { Profile } from '@/lib/types'

interface AppContextValue {
  profile: Profile
  userId: string
}

export const AppContext = createContext<AppContextValue | null>(null)

export function useAppContext() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('No AppContext')
  return ctx
}
