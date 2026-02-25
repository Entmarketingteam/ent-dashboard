import { getAllCreators } from '@/lib/airtable/tokens';
import { CreatorCard } from '@/components/dashboard/creator-card';

export default async function Home() {
  const creators = await getAllCreators();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Creators</h1>
        <p className="text-sm text-muted-foreground mt-1">All creator accounts and token status</p>
      </div>

      {creators.length === 0 ? (
        <p className="text-muted-foreground">No creators found in Airtable.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {creators.map((creator) => (
            <CreatorCard key={creator.id} creator={creator} />
          ))}
        </div>
      )}
    </div>
  );
}
