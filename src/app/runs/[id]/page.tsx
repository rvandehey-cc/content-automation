'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
  configSnapshot: any
  siteProfile: {
    id: string
    name: string
  } | null
  metrics: {
    urlsScraped: number
    urlsFailed: number
    imagesDownloaded: number
    imagesFailed: number
    filesProcessed: number
    filesFailed: number
    postsDetected: number
    pagesDetected: number
    totalDurationMs: number
    errorCount: number
  } | null
}

export default function RunDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [run, setRun] = useState<Run | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Initial fetch
  useEffect(() => {
    if (params.id) {
      fetchRun()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  // Polling for active runs only
  useEffect(() => {
    if (!params.id || !run) return
    
    // Stop polling if run is completed or failed
    if (run.status === 'completed' || run.status === 'failed') {
      return
    }
    
    // Only poll if run is still active
    if (run.status !== 'running' && run.status !== 'pending') {
      return
    }
    
    const interval = setInterval(() => {
      fetchRun()
    }, 2000)
    
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, run?.status])

  const fetchRun = async () => {
    if (!params.id) {
      setError('Run ID is required')
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`/api/runs/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setRun(data)
        setError(null)
      } else if (response.status === 404) {
        setError('Run not found')
        setRun(null)
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch run' }))
        setError(errorData.error || 'Failed to fetch run')
      }
    } catch (err) {
      console.error('Error fetching run:', err)
      setError('Failed to fetch run')
    } finally {
      setLoading(false)
    }
  }

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
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <p>Loading run details...</p>
      </div>
    )
  }

  if (error || !run) {
    return (
      <div className="container mx-auto py-10">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">{error || 'Run not found'}</p>
            <Button className="mt-4" variant="light" onClick={() => router.push('/runs')} aria-label="Go back to runs list">
              Back to Runs
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const pagesProcessed = run.metrics
    ? run.metrics.postsDetected + run.metrics.pagesDetected
    : 0
  const timeSavedMinutes = pagesProcessed * 15
  const timeSavedHours = (timeSavedMinutes / 60).toFixed(2)
  
  const currentStep = run.configSnapshot?.currentStep || null
  const progress = run.configSnapshot?.progress || null
  const csvFilePath = run.status === 'completed' ? '/api/downloads/csv' : null
  const imagesPath = run.configSnapshot?.bypassImages ? null : run.configSnapshot?.contentMigrationImagesPath || null

  return (
    <div className="container mx-auto py-10 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Run Details</h1>
          <p className="text-muted-foreground mt-1">
            {run.siteProfile?.name || run.createdBy || 'No profile'} • {new Date(run.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          {getStatusBadge(run.status)}
          <Button variant="light" onClick={() => router.push('/runs')} aria-label="Go back to runs list">
            Back to Runs
          </Button>
        </div>
      </div>

      {/* Progress Indicator */}
      {run.status === 'running' && currentStep && (
        <Card className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-950">
          <CardHeader>
            <CardTitle>Run in Progress</CardTitle>
            <CardDescription>{currentStep}</CardDescription>
          </CardHeader>
          <CardContent>
            {progress && typeof progress === 'object' && (
              <div className="space-y-2">
                {progress.urlsScraped !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">URLs Scraped:</span>
                    <span className="font-semibold">{progress.urlsScraped}</span>
                  </div>
                )}
                {progress.imagesDownloaded !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Images Downloaded:</span>
                    <span className="font-semibold">{progress.imagesDownloaded}</span>
                  </div>
                )}
                {progress.filesProcessed !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Files Processed:</span>
                    <span className="font-semibold">{progress.filesProcessed}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Completion Success Message */}
      {run.status === 'completed' && (
        <Card className="mb-6 border-green-200 bg-green-50 dark:bg-green-950">
          <CardHeader>
            <CardTitle className="text-green-900 dark:text-green-100">✓ Run Completed Successfully</CardTitle>
            {run.configSnapshot?.dealerSlug && (
              <CardDescription className="text-green-800 dark:text-green-200">
                Content organized by dealer: <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">{run.configSnapshot.dealerSlug}</code>
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {run.configSnapshot?.contentMigrationBasePath && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-md border border-blue-200 dark:border-blue-800">
                <p className="text-sm font-medium mb-1">Content-Migration Base Folder:</p>
                <p className="text-sm text-muted-foreground">
                  <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">{run.configSnapshot.contentMigrationBasePath}</code>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  All content for this dealer is organized in this folder
                </p>
              </div>
            )}
            {csvFilePath && (
              <div>
                <Button asChild>
                  <a href="/api/downloads/csv" download="wordpress-import.csv" aria-label="Download WordPress import CSV file">
                    Download WordPress CSV
                  </a>
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  CSV saved to: <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">{run.configSnapshot?.contentMigrationCsvPath || 'Content-Migration/csv folder'}</code>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Filename includes date to prevent overwrites from multiple runs
                </p>
              </div>
            )}
            {imagesPath && !run.configSnapshot?.bypassImages && (
              <div>
                <p className="text-sm font-medium mb-1">Images Location:</p>
                <p className="text-sm text-muted-foreground">
                  Images saved to: <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">{imagesPath}</code>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Images organized by date for easy management of multiple runs
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Metrics */}
        {run.metrics && (
          <Card>
            <CardHeader>
              <CardTitle>Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">URLs Scraped</p>
                  <p className="text-2xl font-bold">{run.metrics.urlsScraped}</p>
                  {run.metrics.urlsFailed > 0 && (
                    <p className="text-xs text-destructive">{run.metrics.urlsFailed} failed</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Images Downloaded</p>
                  <p className="text-2xl font-bold">{run.metrics.imagesDownloaded}</p>
                  {run.metrics.imagesFailed > 0 && (
                    <p className="text-xs text-destructive">{run.metrics.imagesFailed} failed</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Posts Detected</p>
                  <p className="text-2xl font-bold">{run.metrics.postsDetected}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pages Detected</p>
                  <p className="text-2xl font-bold">{run.metrics.pagesDetected}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Files Processed</p>
                  <p className="text-2xl font-bold">{run.metrics.filesProcessed}</p>
                  {run.metrics.filesFailed > 0 && (
                    <p className="text-xs text-destructive">{run.metrics.filesFailed} failed</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="text-2xl font-bold">
                    {formatDuration(run.metrics.totalDurationMs)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Time Saved */}
        <Card>
          <CardHeader>
            <CardTitle>Time Savings</CardTitle>
            <CardDescription>
              Based on 15 minutes per page migration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <p className="text-5xl font-bold text-primary mb-2">{timeSavedHours}h</p>
              <p className="text-muted-foreground">
                {timeSavedMinutes} minutes saved
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {pagesProcessed} pages processed
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Configuration */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Site Profile:</span>
                <span>
                  {run.siteProfile ? (
                    <Link
                      href={`/site-profiles/${run.siteProfile.id}`}
                      className="text-primary hover:underline"
                    >
                      {run.siteProfile.name}
                    </Link>
                  ) : (
                    'None'
                  )}
                </span>
              </div>
              {run.configSnapshot?.dealerSlug && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dealer Slug:</span>
                  <span>
                    <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">{run.configSnapshot.dealerSlug}</code>
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bypass Images:</span>
                <span>{run.configSnapshot?.bypassImages ? 'Yes' : 'No'}</span>
              </div>
              {run.configSnapshot?.customSelectors && (
                <div>
                  <span className="text-muted-foreground">Custom Selectors:</span>
                  <div className="ml-4 mt-1">
                    {run.configSnapshot.customSelectors.post && (
                      <p>Post: {run.configSnapshot.customSelectors.post}</p>
                    )}
                    {run.configSnapshot.customSelectors.page && (
                      <p>Page: {run.configSnapshot.customSelectors.page}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* URLs */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>URLs ({run.urls.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {run.urls.map((url, idx) => (
                <p key={idx} className="text-sm font-mono break-all">
                  {url}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
