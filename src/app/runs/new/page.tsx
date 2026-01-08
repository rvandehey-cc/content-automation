'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import Link from 'next/link'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface SiteProfile {
  id: string
  name: string
  config: any
}

export default function NewRunPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [siteProfiles, setSiteProfiles] = useState<SiteProfile[]>([])
  const [selectedProfileId, setSelectedProfileId] = useState<string>('none')
  
  // Form state
  const [urls, setUrls] = useState('')
  const [contentType, setContentType] = useState<'post' | 'page'>('post')
  const [bypassImages, setBypassImages] = useState(false)
  const [postDateSelector, setPostDateSelector] = useState('')
  const [postContentSelector, setPostContentSelector] = useState('')
  const [customRemoveSelectors, setCustomRemoveSelectors] = useState('')
  const [dealerSlug, setDealerSlug] = useState('')

  useEffect(() => {
    fetchSiteProfiles()
  }, [])

  useEffect(() => {
    if (selectedProfileId && selectedProfileId !== 'none') {
      loadProfileConfig(selectedProfileId)
    } else {
      // Reset to defaults when no profile selected
      resetFormToDefaults()
    }
  }, [selectedProfileId])

  const fetchSiteProfiles = async () => {
    try {
      const response = await fetch('/api/site-profiles')
      if (response.ok) {
        const data = await response.json()
        setSiteProfiles(data)
      }
    } catch (err) {
      console.error('Error fetching site profiles:', err)
    }
  }

  const loadProfileConfig = async (profileId: string) => {
    try {
      const response = await fetch(`/api/site-profiles/${profileId}`)
      if (!response.ok) return
      
      const profile = await response.json()
      const config = profile.config || {}
      
      // Apply profile config to form fields
      // Note: User can still override these values manually
      
      // Blog post selectors
      if (config.blogPost) {
        if (config.blogPost.dateSelector) {
          setPostDateSelector(config.blogPost.dateSelector)
        }
        if (config.blogPost.contentSelector) {
          setPostContentSelector(config.blogPost.contentSelector)
        }
      }
      
      // Custom remove selectors (merge with existing)
      if (config.processor?.customRemoveSelectors?.length > 0) {
        const profileSelectors = config.processor.customRemoveSelectors.join('\n')
        setCustomRemoveSelectors(prev => {
          const existing = prev.trim()
          return existing ? `${existing}\n${profileSelectors}` : profileSelectors
        })
      }
      
      // WordPress settings
      if (config.wordPress) {
        if (config.wordPress.dealerSlug) {
          setDealerSlug(config.wordPress.dealerSlug)
        }
        if (config.wordPress.imageYear) {
          // Don't override - let user keep current year/month if they want
        }
      }
      
      // Image settings
      if (config.images?.enabled === false) {
        setBypassImages(true)
      }
    } catch (err) {
      console.error('Error loading profile config:', err)
    }
  }

  const resetFormToDefaults = () => {
    setPostDateSelector('')
    setPostContentSelector('')
    setCustomRemoveSelectors('')
    setDealerSlug('')
    setBypassImages(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Parse URLs
      const urlArray = urls
        .split('\n')
        .map(url => url.trim())
        .filter(url => url.length > 0 && (url.startsWith('http://') || url.startsWith('https://')))

      if (urlArray.length === 0) {
        throw new Error('Please enter at least one valid URL')
      }

      // Build blog post selectors if content type is post
      const blogPostSelectors: any = {}
      if (contentType === 'post') {
        if (postDateSelector.trim()) blogPostSelectors.dateSelector = postDateSelector.trim()
        if (postContentSelector.trim()) blogPostSelectors.contentSelector = postContentSelector.trim()
      }

      // Parse custom remove selectors
      const removeSelectorsArray = customRemoveSelectors
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0)

      // Build WordPress settings - auto-set year/month to current date
      const now = new Date()
      const wordPressSettings: any = {}
      if (!bypassImages && dealerSlug.trim()) {
        wordPressSettings.dealerSlug = dealerSlug.trim()
        wordPressSettings.imageYear = now.getFullYear().toString()
        wordPressSettings.imageMonth = (now.getMonth() + 1).toString().padStart(2, '0')
        wordPressSettings.updateImageUrls = true
      }

      const response = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteProfileId: selectedProfileId && selectedProfileId !== 'none' ? selectedProfileId : null,
          urls: urlArray,
          contentType,
          bypassImages,
          blogPostSelectors: Object.keys(blogPostSelectors).length > 0 ? blogPostSelectors : null,
          customRemoveSelectors: removeSelectorsArray,
          wordPressSettings,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to start run')
      }

      const run = await response.json()
      if (run && run.id) {
        router.push(`/runs/${run.id}`)
      } else {
        throw new Error('Run was created but no ID was returned')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Start New Run</h1>
        <p className="text-muted-foreground mt-1">
          Configure and start a new automation run
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Site Profile Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Site Profile (Optional)</CardTitle>
            <CardDescription>
              Select a saved site profile or configure manually below
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="siteProfile">Site Profile</Label>
              <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                <SelectTrigger id="siteProfile">
                  <SelectValue placeholder="None - Configure manually" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None - Configure manually</SelectItem>
                  {siteProfiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {siteProfiles.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No site profiles yet. <Link href="/site-profiles/new" className="text-primary hover:underline">Create one</Link>
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* URLs */}
        <Card>
          <CardHeader>
            <CardTitle>URLs to Scrape</CardTitle>
            <CardDescription>
              Enter one URL per line. Select content type below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contentType">Content Type</Label>
              <Select value={contentType} onValueChange={(value: 'post' | 'page') => setContentType(value)}>
                <SelectTrigger id="contentType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="post">Blog Posts</SelectItem>
                  <SelectItem value="page">Pages</SelectItem>
                </SelectContent>
              </Select>
              <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                <p className="font-medium mb-1">⚠️ Important:</p>
                <p>Only process <strong>{contentType === 'post' ? 'blog posts' : 'pages'}</strong> at a time. Mixing content types in a single run is not supported.</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="urls">URLs</Label>
              <Textarea
                id="urls"
                placeholder="https://example.com/page1&#10;https://example.com/page2&#10;https://example.com/page3"
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
                required
                rows={8}
                className="font-mono text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Image Processing */}
        <Card>
          <CardHeader>
            <CardTitle>Image Processing</CardTitle>
            <CardDescription>
              Configure image downloading and processing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="bypassImages">Bypass Image Processing</Label>
                <p className="text-sm text-muted-foreground">
                  Skip all image downloads and processing
                </p>
              </div>
              <Switch
                id="bypassImages"
                checked={bypassImages}
                onCheckedChange={setBypassImages}
              />
            </div>

            {!bypassImages && (
              <div className="space-y-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label htmlFor="dealerSlug">WordPress Dealer Slug</Label>
                  <Input
                    id="dealerSlug"
                    placeholder="albanytoyota"
                    value={dealerSlug}
                    onChange={(e) => setDealerSlug(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Used for WordPress image URL generation
                  </p>
                </div>
                <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                  <p>📅 Image upload year and month will be automatically set to <strong>{new Date().getFullYear()}/{String(new Date().getMonth() + 1).padStart(2, '0')}</strong></p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Blog Post Configuration */}
        {contentType === 'post' && (
          <Card>
            <CardHeader>
              <CardTitle>Blog Post Configuration</CardTitle>
              <CardDescription>
                CSS selectors for blog post content extraction (optional)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="postDateSelector">Date Selector</Label>
                <Input
                  id="postDateSelector"
                  placeholder=".post-date, time[datetime], .published-date"
                  value={postDateSelector}
                  onChange={(e) => setPostDateSelector(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  CSS selector to extract the publication date from blog posts
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="postContentSelector">Content Selector</Label>
                <Input
                  id="postContentSelector"
                  placeholder=".post-content, article .entry-content, .blog-post-body"
                  value={postContentSelector}
                  onChange={(e) => setPostContentSelector(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  CSS selector to identify the main content area of blog posts
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Custom Element Removal */}
        <Card>
          <CardHeader>
            <CardTitle>Custom Element Removal</CardTitle>
            <CardDescription>
              CSS selectors for elements to remove during processing (optional)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="customRemoveSelectors">Remove Selectors</Label>
              <Textarea
                id="customRemoveSelectors"
                placeholder=".advertisement&#10;#social-share&#10;[class*=&quot;popup&quot;]"
                value={customRemoveSelectors}
                onChange={(e) => setCustomRemoveSelectors(e.target.value)}
                rows={4}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                One CSS selector per line. Elements matching these selectors will be removed.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button type="submit" variant="light" disabled={loading} aria-label="Start the automation run">
            {loading ? 'Starting Run...' : 'Start Run'}
          </Button>
          <Button type="button" variant="light" onClick={() => router.back()} aria-label="Cancel and go back">
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
