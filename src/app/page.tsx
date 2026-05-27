import { HomeClient } from '@/components/home-client';
import { getToilets } from '@/lib/toilets';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const toilets = await getToilets();

  return <HomeClient toilets={toilets} />;
}
