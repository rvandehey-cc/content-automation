'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import Link from 'next/link'

interface SiteProfile {
  id: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
}

export default function SiteProfilesPage() {
  const [profiles, setProfiles] = useState<SiteProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProfiles()
  }, [])

  const fetchProfiles = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/site-profiles')
      if (!response.ok) {
        throw new Error('Failed to fetch profiles')
      }
      const data = await response.json()
      setProfiles(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this profile?')) {
      return
    }

    try {
      const response = await fetch(`/api/site-profiles/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete profile')
      }

      // Refresh the list
      fetchProfiles()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete profile')
    }
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Site Profiles</h1>
          <p className="text-muted-foreground mt-1">
            Manage configuration profiles for different sites
          </p>
        </div>
        <Button variant="light" asChild>
          <Link href="/site-profiles/new" aria-label="Create a new site profile">
            Create Profile
          </Link>
        </Button>
      </div>

      {loading && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Loading profiles...</p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-center text-destructive">Error: {error}</p>
          </CardContent>
        </Card>
      )}

      {!loading && !error && profiles.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No site profiles yet</p>
              <Button asChild>
                <Link href="/site-profiles/new">Create your first profile</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && !error && profiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Profiles</CardTitle>
            <CardDescription>
              {profiles.length} profile{profiles.length !== 1 ? 's' : ''} configured
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/site-profiles/${profile.id}`}
                        className="hover:underline"
                      >
                        {profile.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {profile.description || '-'}
                    </TableCell>
                    <TableCell>
                      {new Date(profile.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {new Date(profile.updatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <Link href={`/site-profiles/${profile.id}/edit`} aria-label={`Edit site profile ${profile.name}`}>
                            Edit
                          </Link>
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(profile.id)}
                          aria-label={`Delete site profile ${profile.name}`}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
