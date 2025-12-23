import * as React from 'react'

declare module '@/components/ui/badge' {
  export interface BadgeProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'className'> {
    variant?: 'default' | 'secondary' | 'destructive' | 'outline'
    className?: string
    children?: React.ReactNode
  }
  export const Badge: React.ComponentType<BadgeProps>
  export const badgeVariants: any
}

