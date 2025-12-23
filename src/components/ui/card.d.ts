import * as React from 'react'

declare module '@/components/ui/card' {
  export const Card: React.ComponentType<React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }>
  export const CardHeader: React.ComponentType<React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }>
  export const CardTitle: React.ComponentType<React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }>
  export const CardDescription: React.ComponentType<React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }>
  export const CardContent: React.ComponentType<React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }>
  export const CardFooter: React.ComponentType<React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }>
}

