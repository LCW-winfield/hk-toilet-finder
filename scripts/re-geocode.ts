import { readFileSync, existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const OUTPUT_PATH = path.join(process.cwd(), 'data', 'raw', 'hong-kong-toilets.json');

const HK_BBOX = { west: 113.83, east: 114.41, south: 22.15, north: 22.58 };

function isInHK(lat: number, lng: number): boolean {
  return lat >= HK_BBOX.south && lat <= HK_BBOX.north && lng >= HK_BBOX.west && lng <= HK_BBOX.east;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
  // Use viewbox for bias but NOT bounded=1 — too restrictive for HK addresses
  const viewbox = `${HK_BBOX.west},${HK_BBOX.south},${HK_BBOX.east},${HK_BBOX.north}`;
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&viewbox=${viewbox}&q=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'HKToiletFinder/1.0 (re-geocode)' }
    });
    if (!response.ok) return null;
    const data = (await response.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    for (const item of data) {
      const lat = Number(item.lat);
      const lng = Number(item.lon);
      if (isInHK(lat, lng)) {
        return { lat, lng };
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** Generate diversified search queries for a toilet. */
function buildQueries(toilet: {
  nameZh: string;
  addressZh: string;
  districtZh: string;
}): string[] {
  const queries: string[] = [];

  // 1. Full address
  if (toilet.addressZh) {
    queries.push(`${toilet.addressZh}, ${toilet.districtZh}, Hong Kong`);
  }

  // 2. Name + district
  queries.push(`${toilet.nameZh}, ${toilet.districtZh}, Hong Kong`);

  // 3. Address without floor/building suffix
  const simpleAddr = toilet.addressZh.replace(/(地下|底層|1樓|2樓|\d+號|\d+樓|停車場|市政大廈).*$/, '').trim();
  if (simpleAddr && simpleAddr !== toilet.addressZh) {
    queries.push(`${simpleAddr}, ${toilet.districtZh}, Hong Kong`);
  }

  // 4. Just name + Hong Kong
  queries.push(`${toilet.nameZh}, Hong Kong`);

  // 5. Name without "公廁" suffix
  const shortName = toilet.nameZh.replace(/公廁$/, '');
  if (shortName !== toilet.nameZh) {
    queries.push(`${shortName}, ${toilet.districtZh}, Hong Kong`);
  }

  // Deduplicate
  return [...new Set(queries)];
}

type ToiletEntry = {
  nameZh: string;
  nameEn: string;
  districtZh: string;
  districtEn: string;
  addressZh: string;
  addressEn: string;
  latitude: number;
  longitude: number;
  openingHours: string;
  accessible: boolean;
  babyCare: boolean;
  cleanlinessScore: number;
  tags: string[];
  sourceId?: number;
};

async function main() {
  const toilets: ToiletEntry[] = JSON.parse(readFileSync(OUTPUT_PATH, 'utf8'));

  const needGeocode = toilets.filter((t) => t.latitude === 0 && t.longitude === 0);
  console.log(`${needGeocode.length} toilets need geocoding out of ${toilets.length} total.\n`);

  let fixed = 0;
  for (let i = 0; i < needGeocode.length; i++) {
    const toilet = needGeocode[i];
    const queries = buildQueries(toilet);
    console.log(`[${i + 1}/${needGeocode.length}] ${toilet.nameZh} (${toilet.districtZh})`);

    let found = false;
    for (const q of queries) {
      await sleep(1200);
      const result = await geocode(q);
      if (result) {
        console.log(`  ✓ ${result.lat}, ${result.lng}  <- "${q.slice(0, 60)}..."`);
        toilet.latitude = result.lat;
        toilet.longitude = result.lng;
        fixed++;
        found = true;
        // Save immediately
        await writeFile(OUTPUT_PATH, JSON.stringify(toilets, null, 2), 'utf8');
        break;
      }
    }

    if (!found) {
      console.log(`  ✗ Still no result`);
    }
  }

  console.log(`\n=== Done! Fixed ${fixed}/${needGeocode.length} ===`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
