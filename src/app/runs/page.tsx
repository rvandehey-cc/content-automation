'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Run {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  urls: string[]
  createdBy: string | null
  siteProfile: {
    name: string
  } | null
  metrics: {
    urlsScraped: number
    urlsFailed: number
    postsDetected: number
    pagesDetected: number
    totalDurationMs: number
  } | null
}

export default function RunsPage() {
  const router = useRouter()
  const [runs, setRuns] = useState<Run[]>([])
  const [loading, setLoading] = useState(true)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchRuns = async () => {
    try {
      const response = await fetch('/api/runs?limit=100')
      if (response.ok) {
        const data = await response.json()
        setRuns(data)
        
        // Check if we should continue polling
        const hasActiveRuns = data.some((r: Run) => r.status === 'running' || r.status === 'pending')
        if (!hasActiveRuns && pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
          pollingIntervalRef.current = null
        } else if (hasActiveRuns && !pollingIntervalRef.current) {
          // Start polling if we have active runs but no interval
          pollingIntervalRef.current = setInterval(() => {
            fetchRuns()
          }, 5000)
        }
      }
    } catch (err) {
      console.error('Error fetching runs:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRuns()
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [])

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: 'default',
      running: 'secondary',
      pending: 'secondary',
      failed: 'destructive',
    }
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>
  }

  const formatDuration = (ms: number | null) => {
    if (!ms) return 'N/A'
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  const calculateTimeSaved = (run: Run) => {
    if (!run.metrics) return null
    const pagesProcessed = run.metrics.postsDetected + run.metrics.pagesDetected
    const timeSavedMinutes = pagesProcessed * 15 // 15 minutes per page
    return {
      minutes: timeSavedMinutes,
      hours: (timeSavedMinutes / 60).toFixed(2),
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <p>Loading runs...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Runs</h1>
          <p className="text-muted-foreground mt-1">
            View and monitor automation runs
          </p>
        </div>
        <Button onClick={() => router.push('/runs/new')}>
          Start New Run
        </Button>
      </div>

      {runs.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Runs Yet</CardTitle>
            <CardDescription>Start your first automation run to get started</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => router.push('/runs/new')}>
              Start New Run
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {runs.map((run) => {
            const timeSaved = calculateTimeSaved(run)
            return (
              <Card key={run.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        Run #{run.id.slice(0, 8)}
                        {getStatusBadge(run.status)}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {run.siteProfile?.name || run.createdBy || 'No profile'} • {new Date(run.createdAt).toLocaleString()}
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/runs/${run.id}`)}
                    >
                      View Details
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">URLs</p>
                      <p className="text-2xl font-bold">{run.urls.length}</p>
                    </div>
                    {run.metrics && (
                      <>
                        <div>
                          <p className="text-sm text-muted-foreground">Scraped</p>
                          <p className="text-2xl font-bold">{run.metrics.urlsScraped}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Pages</p>
                          <p className="text-2xl font-bold">
                            {run.metrics.postsDetected + run.metrics.pagesDetected}
                          </p>
                        </div>
                        {timeSaved && (
                          <div>
                            <p className="text-sm text-muted-foreground">Time Saved</p>
                            <p className="text-2xl font-bold">{timeSaved.hours}h</p>
                            <p className="text-xs text-muted-foreground">
                              ({timeSaved.minutes} min)
                            </p>
                          </div>
                        )}
                      </>
                    )}
                    {!run.metrics && run.status !== 'failed' && (
                      <div className="col-span-2">
                        <p className="text-sm text-muted-foreground">Duration</p>
                        <p className="text-lg">
                          {run.startedAt
                            ? formatDuration(
                                Date.now() - new Date(run.startedAt).getTime()
                              )
                            : 'Not started'}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
