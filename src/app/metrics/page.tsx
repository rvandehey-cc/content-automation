'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Metrics {
  totals: {
    runs: number
    urlsScraped: number
    postsDetected: number
    pagesDetected: number
    pagesProcessed: number
    timeSavedMinutes: number
    timeSavedHours: number
    uniqueSites: number
  }
  perUser: {
    runs: Array<{ user: string; count: number }>
    sites: Array<{ user: string; siteCount: number }>
  }
}

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMetrics()
    // Refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/metrics')
      if (response.ok) {
        const data = await response.json()
        setMetrics(data)
      }
    } catch (err) {
      console.error('Error fetching metrics:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <p>Loading metrics...</p>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="container mx-auto py-10">
        <p>No metrics available</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Metrics Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Aggregated statistics across all automation runs
        </p>
      </div>

      {/* Total Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Runs</CardDescription>
            <CardTitle className="text-4xl">{metrics.totals.runs}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>URLs Scraped</CardDescription>
            <CardTitle className="text-4xl">{metrics.totals.urlsScraped}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pages Processed</CardDescription>
            <CardTitle className="text-4xl">{metrics.totals.pagesProcessed}</CardTitle>
            <CardDescription className="pt-1">
              {metrics.totals.postsDetected} posts, {metrics.totals.pagesDetected} pages
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Time Saved</CardDescription>
            <CardTitle className="text-4xl">{metrics.totals.timeSavedHours}h</CardTitle>
            <CardDescription className="pt-1">
              {metrics.totals.timeSavedMinutes.toLocaleString()} minutes
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Sites Scraped */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Sites Scraped</CardTitle>
          <CardDescription>
            Unique sites processed across all runs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{metrics.totals.uniqueSites}</p>
        </CardContent>
      </Card>

      {/* Per User Stats */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Runs per User</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.perUser.runs.length === 0 ? (
              <p className="text-muted-foreground">No data available</p>
            ) : (
              <div className="space-y-2">
                {metrics.perUser.runs.map((item) => (
                  <div key={item.user} className="flex justify-between">
                    <span className="text-muted-foreground">{item.user}</span>
                    <span className="font-bold">{item.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sites per User</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.perUser.sites.length === 0 ? (
              <p className="text-muted-foreground">No data available</p>
            ) : (
              <div className="space-y-2">
                {metrics.perUser.sites.map((item) => (
                  <div key={item.user} className="flex justify-between">
                    <span className="text-muted-foreground">{item.user}</span>
                    <span className="font-bold">{item.siteCount}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Time Savings Breakdown */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Time Savings Breakdown</CardTitle>
          <CardDescription>
            Based on 15 minutes per page migration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total Pages Processed</span>
              <span className="text-2xl font-bold">{metrics.totals.pagesProcessed}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Minutes Saved</span>
              <span className="text-2xl font-bold">
                {metrics.totals.timeSavedMinutes.toLocaleString()} min
              </span>
            </div>
            <div className="flex justify-between items-center border-t pt-4">
              <span className="text-lg font-semibold">Hours Saved</span>
              <span className="text-3xl font-bold text-primary">
                {metrics.totals.timeSavedHours.toLocaleString()}h
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
