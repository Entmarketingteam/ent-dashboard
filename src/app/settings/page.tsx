import { getAllCreators } from '@/lib/airtable/tokens';
import { TokenStatusBadge } from '@/components/dashboard/token-status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

const BOOKMARKLET = `javascript:void(function(){try{var k=Object.keys(localStorage).find(function(k){return k.indexOf('@@auth0spajs@@')>-1&&k.indexOf('iKyQz7GfBMBPqUqCbbKSNBUlM2VpNWUT')>-1});if(!k){alert('Not logged in to LTK');return}var d=JSON.parse(localStorage.getItem(k));var p={access_token:d.body.access_token,refresh_token:d.body.refresh_token,expires_at:d.expiresAt};navigator.clipboard.writeText(JSON.stringify(p)).then(function(){alert('Copied! Paste into the dashboard settings page.')}).catch(function(){prompt('Copy this:',JSON.stringify(p))})}catch(e){alert('Error: '+e.message)}})()`;

export default async function SettingsPage() {
  const creators = await getAllCreators();
  const needsReauth = creators.filter((c) => c.status === 'needs_reauth');

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Token health and re-authentication</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Creator Token Status</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {creators.map((c) => (
            <div key={c.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{c.creator}</p>
                {c.lastRefreshed && (
                  <p className="text-xs text-muted-foreground">
                    Last refreshed: {new Date(c.lastRefreshed).toLocaleString()}
                  </p>
                )}
              </div>
              <TokenStatusBadge status={c.status} />
            </div>
          ))}
          {creators.length === 0 && (
            <p className="text-sm text-muted-foreground">No creators found.</p>
          )}
        </CardContent>
      </Card>

      {needsReauth.length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            {needsReauth.map((c) => c.creator).join(', ')} need re-authentication.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader><CardTitle className="text-sm">Re-Authentication Instructions</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Log in to <strong>creator.shopltk.com</strong></li>
            <li>Create a bookmark with the following URL (drag to bookmarks bar):</li>
          </ol>

          <div className="bg-muted rounded p-3">
            <p className="text-xs font-mono break-all">{BOOKMARKLET}</p>
          </div>

          <Separator />

          <ol className="list-decimal list-inside space-y-2 text-sm" start={3}>
            <li>Click the bookmarklet while on the LTK creator dashboard</li>
            <li>Copy the token JSON that appears</li>
            <li>
              POST it to <code className="text-xs bg-muted px-1 rounded">/api/connect/ltk</code> with your creator slug:
              <pre className="bg-muted rounded p-2 mt-2 text-xs overflow-auto">{`curl -X POST /api/connect/ltk \\
  -H "Content-Type: application/json" \\
  -d '{"slug":"nicki","access_token":"...","refresh_token":"..."}'`}</pre>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
