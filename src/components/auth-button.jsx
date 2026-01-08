'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createClient } from '../lib/supabase/client.js'

export function AuthButton() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  if (!user) {
    return (
      <Button asChild variant="outline">
        <a href="/auth/login">Login</a>
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-primary-foreground/90">{user.email}</span>
      <Button variant="light" onClick={handleLogout}>
        Logout
      </Button>
    </div>
  )
}
