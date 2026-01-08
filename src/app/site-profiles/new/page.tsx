'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import type { SiteProfileConfig } from '@/types/site-profile'

export default function NewSiteProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Basic info
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [provider, setProvider] = useState('')
  
  // Scraper config
  const [contentSelectors, setContentSelectors] = useState('article, .blog-post-detail, .post-content, .entry-content, main, .main-content')
  const [waitTime, setWaitTime] = useState('2000')
  const [timeout, setTimeout] = useState('60000')
  const [maxRetries, setMaxRetries] = useState('2')
  
  // Blog post config
  const [blogContentSelector, setBlogContentSelector] = useState('')
  const [blogDateSelector, setBlogDateSelector] = useState('')
  const [blogTitleSelector, setBlogTitleSelector] = useState('')
  const [blogExcludeSelectors, setBlogExcludeSelectors] = useState('')
  
  // Page config
  const [pageContentSelector, setPageContentSelector] = useState('')
  const [pageExcludeSelectors, setPageExcludeSelectors] = useState('')
  
  // Processor config
  const [customRemoveSelectors, setCustomRemoveSelectors] = useState('')
  const [preserveBootstrapClasses, setPreserveBootstrapClasses] = useState(true)
  const [removeAllClasses, setRemoveAllClasses] = useState(false)
  const [removeAllIds, setRemoveAllIds] = useState(true)
  
  // Image config
  const [imagesEnabled, setImagesEnabled] = useState(true)
  const [maxConcurrent, setMaxConcurrent] = useState('5')
  const [imageTimeout, setImageTimeout] = useState('30000')
  const [allowedFormats, setAllowedFormats] = useState('jpg,jpeg,png,gif,webp')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Build config object
      const config: SiteProfileConfig = {
        provider: provider.trim() || undefined,
        scraper: {
          contentSelectors: contentSelectors
            .split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0),
          waitTime: parseInt(waitTime) || undefined,
          timeout: parseInt(timeout) || undefined,
          maxRetries: parseInt(maxRetries) || undefined,
        },
        blogPost: {
          contentSelector: blogContentSelector.trim() || undefined,
          dateSelector: blogDateSelector.trim() || undefined,
          titleSelector: blogTitleSelector.trim() || undefined,
          excludeSelectors: blogExcludeSelectors
            .split('\n')
            .map(s => s.trim())
            .filter(s => s.length > 0),
        },
        page: {
          contentSelector: pageContentSelector.trim() || undefined,
          excludeSelectors: pageExcludeSelectors
            .split('\n')
            .map(s => s.trim())
            .filter(s => s.length > 0),
        },
        processor: {
          customRemoveSelectors: customRemoveSelectors
            .split('\n')
            .map(s => s.trim())
            .filter(s => s.length > 0),
          preserveBootstrapClasses: preserveBootstrapClasses,
          removeAllClasses: removeAllClasses,
          removeAllIds: removeAllIds,
        },
        images: {
          enabled: imagesEnabled,
          maxConcurrent: parseInt(maxConcurrent) || undefined,
          timeout: parseInt(imageTimeout) || undefined,
          allowedFormats: allowedFormats
            .split(',')
            .map(s => s.trim().toLowerCase())
            .filter(s => s.length > 0),
        },
      }

      // Remove empty objects
      if (config.scraper && Object.keys(config.scraper).length === 0) delete config.scraper
      if (config.blogPost && Object.values(config.blogPost).every(v => !v || (Array.isArray(v) && v.length === 0))) {
        delete config.blogPost
      }
      if (config.page && Object.values(config.page).every(v => !v || (Array.isArray(v) && v.length === 0))) {
        delete config.page
      }
      if (config.processor && Object.keys(config.processor).length === 0) delete config.processor
      if (config.images && Object.keys(config.images).length === 0) delete config.images

      const response = await fetch('/api/site-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          config,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create profile')
      }

      const profile = await response.json()
      router.push(`/site-profiles/${profile.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Create Site Profile</h1>
        <p className="text-muted-foreground mt-1">
          Configure scraping and processing settings for a specific site
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

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              General information about this site profile
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Profile Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Dealer.com - Ford Dealership"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description of this profile"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider">Provider/Platform</Label>
              <Input
                id="provider"
                placeholder="e.g., Dealer.com, DealerOn, WordPress, Custom"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                The CMS or platform this site uses (optional)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Scraper Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Scraper Configuration</CardTitle>
            <CardDescription>
              Settings for how content is extracted from pages
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contentSelectors">Content Selectors</Label>
              <Textarea
                id="contentSelectors"
                placeholder="article, .blog-post-detail, .post-content, main"
                value={contentSelectors}
                onChange={(e) => setContentSelectors(e.target.value)}
                rows={2}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                CSS selectors to try for content extraction (comma-separated, tried in order)
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="waitTime">Wait Time (ms)</Label>
                <Input
                  id="waitTime"
                  type="number"
                  value={waitTime}
                  onChange={(e) => setWaitTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeout">Timeout (ms)</Label>
                <Input
                  id="timeout"
                  type="number"
                  value={timeout}
                  onChange={(e) => setTimeout(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxRetries">Max Retries</Label>
                <Input
                  id="maxRetries"
                  type="number"
                  value={maxRetries}
                  onChange={(e) => setMaxRetries(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Blog Post Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Blog Post Configuration</CardTitle>
            <CardDescription>
              Specific settings for blog post content extraction
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="blogContentSelector">Content Selector</Label>
              <Input
                id="blogContentSelector"
                placeholder=".post-content, article .entry-content, .blog-post-body"
                value={blogContentSelector}
                onChange={(e) => setBlogContentSelector(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                CSS selector for the main blog post content area
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="blogDateSelector">Date Selector</Label>
              <Input
                id="blogDateSelector"
                placeholder=".post-date, time[datetime], .published-date"
                value={blogDateSelector}
                onChange={(e) => setBlogDateSelector(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                CSS selector to extract the publication date
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="blogTitleSelector">Title Selector</Label>
              <Input
                id="blogTitleSelector"
                placeholder=".post-title, h1.entry-title"
                value={blogTitleSelector}
                onChange={(e) => setBlogTitleSelector(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                CSS selector for post title (if different from h1)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="blogExcludeSelectors">Elements to Exclude</Label>
              <Textarea
                id="blogExcludeSelectors"
                placeholder=".advertisement&#10;#social-share&#10;.related-posts"
                value={blogExcludeSelectors}
                onChange={(e) => setBlogExcludeSelectors(e.target.value)}
                rows={3}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                CSS selectors for elements to exclude from blog posts (one per line)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Page Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Page Configuration</CardTitle>
            <CardDescription>
              Specific settings for page content extraction
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pageContentSelector">Content Selector</Label>
              <Input
                id="pageContentSelector"
                placeholder=".page-content, .main-content, #content"
                value={pageContentSelector}
                onChange={(e) => setPageContentSelector(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                CSS selector for the main page content area
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pageExcludeSelectors">Elements to Exclude</Label>
              <Textarea
                id="pageExcludeSelectors"
                placeholder=".sidebar&#10;.footer-content&#10;.navigation"
                value={pageExcludeSelectors}
                onChange={(e) => setPageExcludeSelectors(e.target.value)}
                rows={3}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                CSS selectors for elements to exclude from pages (one per line)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Processor Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Content Processing</CardTitle>
            <CardDescription>
              Settings for cleaning and processing scraped content
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customRemoveSelectors">Custom Remove Selectors</Label>
              <Textarea
                id="customRemoveSelectors"
                placeholder=".advertisement&#10;#social-share&#10;[class*=&quot;popup&quot;]"
                value={customRemoveSelectors}
                onChange={(e) => setCustomRemoveSelectors(e.target.value)}
                rows={3}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                CSS selectors for elements to always remove during processing (one per line)
              </p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="preserveBootstrapClasses">Preserve Bootstrap Classes</Label>
                  <p className="text-sm text-muted-foreground">
                    Keep Bootstrap layout classes (col-*, row, container, etc.)
                  </p>
                </div>
                <Switch
                  id="preserveBootstrapClasses"
                  checked={preserveBootstrapClasses}
                  onCheckedChange={setPreserveBootstrapClasses}
                  disabled={removeAllClasses}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="removeAllClasses">Remove All Classes</Label>
                  <p className="text-sm text-muted-foreground">
                    Remove all class attributes (overrides preserve Bootstrap)
                  </p>
                </div>
                <Switch
                  id="removeAllClasses"
                  checked={removeAllClasses}
                  onCheckedChange={setRemoveAllClasses}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="removeAllIds">Remove All IDs</Label>
                  <p className="text-sm text-muted-foreground">
                    Remove all id attributes from elements
                  </p>
                </div>
                <Switch
                  id="removeAllIds"
                  checked={removeAllIds}
                  onCheckedChange={setRemoveAllIds}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Image Processing Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Image Processing</CardTitle>
            <CardDescription>
              Settings for downloading and processing images
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="imagesEnabled">Enable Image Processing</Label>
                <p className="text-sm text-muted-foreground">
                  Download and process images from scraped content
                </p>
              </div>
              <Switch
                id="imagesEnabled"
                checked={imagesEnabled}
                onCheckedChange={setImagesEnabled}
              />
            </div>
            {imagesEnabled && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxConcurrent">Max Concurrent Downloads</Label>
                    <Input
                      id="maxConcurrent"
                      type="number"
                      value={maxConcurrent}
                      onChange={(e) => setMaxConcurrent(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="imageTimeout">Timeout (ms)</Label>
                    <Input
                      id="imageTimeout"
                      type="number"
                      value={imageTimeout}
                      onChange={(e) => setImageTimeout(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="allowedFormats">Allowed Formats</Label>
                  <Input
                    id="allowedFormats"
                    placeholder="jpg,jpeg,png,gif,webp"
                    value={allowedFormats}
                    onChange={(e) => setAllowedFormats(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma-separated list of allowed image formats
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button type="submit" variant="light" disabled={loading} aria-label="Create the site profile">
            {loading ? 'Creating...' : 'Create Profile'}
          </Button>
          <Button type="button" variant="light" onClick={() => router.back()} aria-label="Cancel and go back">
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}

