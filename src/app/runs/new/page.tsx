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
  const [bypassImages, setBypassImages] = useState(false)
  const [postSelector, setPostSelector] = useState('')
  const [pageSelector, setPageSelector] = useState('')
  const [customRemoveSelectors, setCustomRemoveSelectors] = useState('')
  const [dealerSlug, setDealerSlug] = useState('')
  const [imageYear, setImageYear] = useState(new Date().getFullYear().toString())
  const [imageMonth, setImageMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'))

  useEffect(() => {
    fetchSiteProfiles()
  }, [])

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

      // Build custom selectors
      const customSelectors: any = {}
      if (postSelector.trim()) customSelectors.post = postSelector.trim()
      if (pageSelector.trim()) customSelectors.page = pageSelector.trim()

      // Parse custom remove selectors
      const removeSelectorsArray = customRemoveSelectors
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0)

      // Build WordPress settings
      const wordPressSettings: any = {}
      if (!bypassImages && dealerSlug.trim()) {
        wordPressSettings.dealerSlug = dealerSlug.trim()
        wordPressSettings.imageYear = imageYear.trim()
        wordPressSettings.imageMonth = imageMonth.trim().padStart(2, '0')
        wordPressSettings.updateImageUrls = true
      }

      const response = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteProfileId: selectedProfileId && selectedProfileId !== 'none' ? selectedProfileId : null,
          urls: urlArray,
          bypassImages,
          customSelectors: Object.keys(customSelectors).length > 0 ? customSelectors : null,
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
              Enter one URL per line
            </CardDescription>
          </CardHeader>
          <CardContent>
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="imageYear">Upload Year</Label>
                    <Input
                      id="imageYear"
                      type="number"
                      value={imageYear}
                      onChange={(e) => setImageYear(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="imageMonth">Upload Month (01-12)</Label>
                    <Input
                      id="imageMonth"
                      type="number"
                      min="1"
                      max="12"
                      value={imageMonth}
                      onChange={(e) => setImageMonth(e.target.value.padStart(2, '0'))}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Content Type Detection */}
        <Card>
          <CardHeader>
            <CardTitle>Content Type Detection</CardTitle>
            <CardDescription>
              CSS selectors to identify posts vs pages (optional)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="postSelector">Post Selector</Label>
              <Input
                id="postSelector"
                placeholder="post-navigation, .article-header"
                value={postSelector}
                onChange={(e) => setPostSelector(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                CSS class or selector that appears on blog posts
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pageSelector">Page Selector</Label>
              <Input
                id="pageSelector"
                placeholder="page-header, .static-content"
                value={pageSelector}
                onChange={(e) => setPageSelector(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                CSS class or selector that appears on static pages
              </p>
            </div>
          </CardContent>
        </Card>

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
          <Button type="submit" disabled={loading}>
            {loading ? 'Starting Run...' : 'Start Run'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
