import { HomeClient } from '@/components/home-client';
import { getToilets } from '@/lib/toilets';

export default async function HomePage() {
  const toilets = await getToilets();

  return <HomeClient toilets={toilets} />;
}
