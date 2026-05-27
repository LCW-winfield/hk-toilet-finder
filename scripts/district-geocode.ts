import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const OUTPUT_PATH = path.join(process.cwd(), 'data', 'raw', 'hong-kong-toilets.json');
const GEOCODE_CACHE_PATH = path.join(process.cwd(), 'data', 'raw', 'district-coords.json');

const HK_BBOX = { west: 113.83, east: 114.41, south: 22.15, north: 22.58 };

function isInHK(lat: number, lng: number): boolean {
  return lat >= HK_BBOX.south && lat <= HK_BBOX.north && lng >= HK_BBOX.west && lng <= HK_BBOX.east;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

async function geocodeDistrict(district: string): Promise<{ lat: number; lng: number } | null> {
  const viewbox = `${HK_BBOX.west},${HK_BBOX.south},${HK_BBOX.east},${HK_BBOX.north}`;
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=3&viewbox=${viewbox}&q=${encodeURIComponent(district + ', Hong Kong')}`;

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'HKToiletFinder/1.0 (district-locator)' }
    });
    if (!response.ok) return null;
    const data = (await response.json()) as Array<{ lat: string; lon: string }>;
    for (const item of data) {
      const lat = Number(item.lat);
      const lng = Number(item.lon);
      if (isInHK(lat, lng)) return { lat, lng };
    }
    return null;
  } catch {
    return null;
  }
}

async function main() {
  const toilets: ToiletEntry[] = JSON.parse(readFileSync(OUTPUT_PATH, 'utf8'));

  // All unique districts from toilets without coords
  const noCoordToilets = toilets.filter((t) => t.latitude === 0 && t.longitude === 0);
  const districts = [...new Set(noCoordToilets.map((t) => t.districtZh))];

  console.log(`${noCoordToilets.length} toilets without coords across ${districts.length} districts.\n`);

  // Load cached district coords
  let cache: Record<string, { lat: number; lng: number }> = {};
  try { cache = JSON.parse(readFileSync(GEOCODE_CACHE_PATH, 'utf8')); } catch { /* ok */ }

  // Geocode uncached districts
  const missing = districts.filter((d) => !cache[d]);
  console.log(`Geocoding ${missing.length} district centers...\n`);

  for (const district of missing) {
    await sleep(1500);
    const result = await geocodeDistrict(district);
    if (result) {
      cache[district] = result;
      console.log(`  ✓ ${district}: ${result.lat}, ${result.lng}`);
    } else {
      // Fallback: Hong Kong center
      cache[district] = { lat: 22.3193, lng: 114.1694 };
      console.log(`  ✗ ${district}: using HK default`);
    }
    // Save cache after each
    await writeFile(GEOCODE_CACHE_PATH, JSON.stringify(cache, null, 2), 'utf8');
  }

  // Apply district coords to toilets without coords
  let applied = 0;
  for (const toilet of noCoordToilets) {
    const coords = cache[toilet.districtZh];
    if (coords) {
      toilet.latitude = coords.lat;
      toilet.longitude = coords.lng;
      applied++;
    }
  }

  await writeFile(OUTPUT_PATH, JSON.stringify(toilets, null, 2), 'utf8');
  console.log(`\nApplied district-level coords to ${applied} toilets.`);
  console.log(`Saved to ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
