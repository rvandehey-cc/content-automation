'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import type { SiteProfileConfig } from '@/types/site-profile'

export default function SiteProfileDetailPage() {
  const params = useParams()
  const router = useRouter()
  const profileId = params.id as string
  
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProfile()
  }, [profileId])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/site-profiles/${profileId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch profile')
      }
      const data = await response.json()
      setProfile(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this profile? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/site-profiles/${profileId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete profile')
      }

      router.push('/site-profiles')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete profile')
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Loading profile...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="container mx-auto py-10">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-center text-destructive">
              {error || 'Profile not found'}
            </p>
            <div className="mt-4 flex justify-center">
              <Button asChild variant="outline">
                <Link href="/site-profiles">Back to Profiles</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const config: SiteProfileConfig = profile.config || {}

  return (
    <div className="container mx-auto py-10 max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">{profile.name}</h1>
          {profile.description && (
            <p className="text-muted-foreground mt-1">{profile.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href={`/site-profiles/${profileId}/edit`} aria-label={`Edit site profile ${profile.name}`}>
              Edit
            </Link>
          </Button>
          <Button variant="destructive" onClick={handleDelete} aria-label={`Delete site profile ${profile.name}`}>
            Delete
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Provider</p>
                <p className="text-base">{config.provider || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Created</p>
                <p className="text-base">{new Date(profile.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                <p className="text-base">{new Date(profile.updatedAt).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Created By</p>
                <p className="text-base">{profile.createdBy || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scraper Config */}
        {config.scraper && (
          <Card>
            <CardHeader>
              <CardTitle>Scraper Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {config.scraper.contentSelectors && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Content Selectors</p>
                  <p className="text-base font-mono text-sm">{config.scraper.contentSelectors.join(', ')}</p>
                </div>
              )}
              <div className="grid grid-cols-3 gap-4">
                {config.scraper.waitTime && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Wait Time</p>
                    <p className="text-base">{config.scraper.waitTime}ms</p>
                  </div>
                )}
                {config.scraper.timeout && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Timeout</p>
                    <p className="text-base">{config.scraper.timeout}ms</p>
                  </div>
                )}
                {config.scraper.maxRetries && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Max Retries</p>
                    <p className="text-base">{config.scraper.maxRetries}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Blog Post Config */}
        {config.blogPost && (
          <Card>
            <CardHeader>
              <CardTitle>Blog Post Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {config.blogPost.contentSelector && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Content Selector</p>
                  <p className="text-base font-mono text-sm">{config.blogPost.contentSelector}</p>
                </div>
              )}
              {config.blogPost.dateSelector && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Date Selector</p>
                  <p className="text-base font-mono text-sm">{config.blogPost.dateSelector}</p>
                </div>
              )}
              {config.blogPost.titleSelector && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Title Selector</p>
                  <p className="text-base font-mono text-sm">{config.blogPost.titleSelector}</p>
                </div>
              )}
              {config.blogPost.excludeSelectors && config.blogPost.excludeSelectors.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Exclude Selectors</p>
                  <p className="text-base font-mono text-sm">{config.blogPost.excludeSelectors.join(', ')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Page Config */}
        {config.page && (
          <Card>
            <CardHeader>
              <CardTitle>Page Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {config.page.contentSelector && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Content Selector</p>
                  <p className="text-base font-mono text-sm">{config.page.contentSelector}</p>
                </div>
              )}
              {config.page.excludeSelectors && config.page.excludeSelectors.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Exclude Selectors</p>
                  <p className="text-base font-mono text-sm">{config.page.excludeSelectors.join(', ')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Processor Config */}
        {config.processor && (
          <Card>
            <CardHeader>
              <CardTitle>Processing Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {config.processor.customRemoveSelectors && config.processor.customRemoveSelectors.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Custom Remove Selectors</p>
                  <p className="text-base font-mono text-sm">{config.processor.customRemoveSelectors.join(', ')}</p>
                </div>
              )}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Preserve Bootstrap</p>
                  <p className="text-base">{config.processor.preserveBootstrapClasses !== false ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Remove All Classes</p>
                  <p className="text-base">{config.processor.removeAllClasses ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Remove All IDs</p>
                  <p className="text-base">{config.processor.removeAllIds !== false ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Image Config */}
        {config.images && (
          <Card>
            <CardHeader>
              <CardTitle>Image Processing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Enabled</p>
                  <p className="text-base">{config.images.enabled !== false ? 'Yes' : 'No'}</p>
                </div>
                {config.images.maxConcurrent && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Max Concurrent</p>
                    <p className="text-base">{config.images.maxConcurrent}</p>
                  </div>
                )}
                {config.images.timeout && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Timeout</p>
                    <p className="text-base">{config.images.timeout}ms</p>
                  </div>
                )}
                {config.images.allowedFormats && config.images.allowedFormats.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Allowed Formats</p>
                    <p className="text-base">{config.images.allowedFormats.join(', ')}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Runs */}
        {profile.runs && profile.runs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Runs</CardTitle>
              <CardDescription>
                Latest runs using this profile
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {profile.runs.map((run: any) => (
                  <div key={run.id} className="flex justify-between items-center py-2 border-b last:border-0">
                    <div>
                      <Link href={`/runs/${run.id}`} className="hover:underline">
                        Run {run.id.slice(0, 8)}...
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {new Date(run.createdAt).toLocaleString()} - {run.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

