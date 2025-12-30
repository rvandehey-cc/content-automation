import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Home() {
  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Content Automation Dashboard</h1>
        <p className="text-muted-foreground">
          Run automation workflows, track metrics, and manage site configurations
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Start New Run</CardTitle>
            <CardDescription>Configure and start an automation run</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/runs/new">
              <Button variant="light" className="w-full" aria-label="Start a new automation run">
                Start Run
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Runs</CardTitle>
            <CardDescription>View and monitor automation runs</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/runs">
              <Button variant="outline" className="w-full" aria-label="View all automation runs">
                View Runs
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Site Profiles</CardTitle>
            <CardDescription>Manage site configurations</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/site-profiles">
              <Button variant="outline" className="w-full" aria-label="Manage site configuration profiles">
                Manage Profiles
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Metrics</CardTitle>
            <CardDescription>View aggregated statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/metrics">
              <Button variant="outline" className="w-full" aria-label="View aggregated metrics and statistics">
                View Metrics
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}