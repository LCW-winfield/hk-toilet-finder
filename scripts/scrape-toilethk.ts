import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
const BASE = 'https://toilethk.com';
const DELAY_MS = 800;
const OUTPUT_PATH = path.join(process.cwd(), 'data', 'raw', 'hong-kong-toilets.json');

type ToiletOutput = {
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
  sourceId: number;
};

// ---- helpers ----

async function fetchPage(url: string): Promise<string> {
  const response = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.text();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---- parsers ----

function parseDistrictIds(html: string): Array<{ id: number; name: string; count: number }> {
  const regex = /<a href="\/district_list\.php\?id=(\d+)">([^<]+)\s*<span>\((\d+)\)<\/span><\/a>/gi;
  const seen = new Map<number, { name: string; count: number }>();

  let match;
  while ((match = regex.exec(html)) !== null) {
    const id = Number(match[1]);
    const name = match[2].trim();
    const count = Number(match[3]);
    if (!seen.has(id)) {
      seen.set(id, { name, count });
    }
  }

  return Array.from(seen.entries()).map(([id, info]) => ({
    id,
    name: info.name,
    count: info.count
  }));
}

function parseToiletList(html: string): Array<{ id: number; name: string }> {
  const regex = /<a href="\/toilet_view\.php\?toilet_id=(\d+)">([^<]+)<\/a>/gi;
  const seen = new Set<number>();
  const toilets: Array<{ id: number; name: string }> = [];

  let match;
  while ((match = regex.exec(html)) !== null) {
    const id = Number(match[1]);
    const name = match[2].trim();
    if (!name || seen.has(id)) continue;
    seen.add(id);
    toilets.push({ id, name });
  }

  return toilets;
}

/** Extract fields from a toilet detail page. */
function parseToiletDetail(html: string): {
  district: string;
  address: string;
  hours: string;
  googleMapsQuery: string;
} {
  const districtMatch = html.match(/地區 District:<\/span>\s*([^<]+)</i);
  const addressMatch = html.match(/公廁地址 Toilet Address:[\s\S]*?<a[^>]*>([^<]+)<\/a>/i);
  const hoursMatch = html.match(/公廁開放時間 Toilet Opening Hours:[\s\S]*?<br \/>\s*([^<]+)\s*<br/i);
  const gmQueryMatch = html.match(/https:\/\/maps\.google\.com\/\?q=([^"&\s]+)/);

  return {
    district: districtMatch ? districtMatch[1].trim() : '',
    address: addressMatch ? addressMatch[1].trim() : '',
    hours: hoursMatch ? hoursMatch[1].trim() : '',
    googleMapsQuery: gmQueryMatch ? decodeURIComponent(gmQueryMatch[1]) : ''
  };
}

// HK bounding box for Nominatim viewbox + validation
const HK_BBOX = {
  west: 113.83,
  east: 114.41,
  south: 22.15,
  north: 22.58
};

function isInHK(lat: number, lng: number): boolean {
  return lat >= HK_BBOX.south && lat <= HK_BBOX.north && lng >= HK_BBOX.west && lng <= HK_BBOX.east;
}

// ---- geocoding ----

async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
  // Nominatim viewbox = <x1>,<y1>,<x2>,<y2> = west,south,east,north
  const viewbox = `${HK_BBOX.west},${HK_BBOX.south},${HK_BBOX.east},${HK_BBOX.north}`;
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=3&bounded=1&viewbox=${viewbox}&q=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'HKToiletFinder/1.0 (scraper)' }
    });
    if (!response.ok) return null;
    const data = (await response.json()) as Array<{ lat: string; lon: string }>;
    if (!data.length) return null;

    // Return the first result that falls within HK
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

/** Try multiple search queries for the same toilet, return first successful geocode. */
async function geocodeToilet(
  nameZh: string,
  address: string,
  district: string,
  googleMapsQuery: string
): Promise<{ lat: number; lng: number } | null> {
  const candidates: string[] = [];

  // 1) Google Maps query from the page (most accurate)
  if (googleMapsQuery) {
    candidates.push(`${googleMapsQuery}, Hong Kong`);
  }

  // 2) Address + district
  if (address && district) {
    candidates.push(`${address}, ${district}, Hong Kong`);
  }

  // 3) Name + district
  if (nameZh && district) {
    candidates.push(`${nameZh}, ${district}, Hong Kong`);
  }

  // 4) Address only
  if (address) {
    candidates.push(`${address}, Hong Kong`);
  }

  // Deduplicate
  const unique = [...new Set(candidates)];

  for (const query of unique) {
    const result = await geocode(query);
    if (result) return result;
    await sleep(1200); // Nominatim rate limit
  }

  return null;
}

// ---- resume logic ----

function loadExistingOutput(): { toilets: ToiletOutput[]; scrapedIds: Set<number>; geocodedIds: Set<number> } {
  if (!existsSync(OUTPUT_PATH)) {
    return { toilets: [], scrapedIds: new Set(), geocodedIds: new Set() };
  }

  const raw = readFileSync(OUTPUT_PATH, 'utf8');
  const toilets = JSON.parse(raw) as ToiletOutput[];

  const scrapedIds = new Set<number>();
  const geocodedIds = new Set<number>();

  for (const t of toilets) {
    if (t.sourceId) {
      scrapedIds.add(t.sourceId);
      if (t.latitude !== 0 || t.longitude !== 0) {
        geocodedIds.add(t.sourceId);
      }
    }
  }

  return { toilets, scrapedIds, geocodedIds };
}

async function saveOutput(toilets: ToiletOutput[]): Promise<void> {
  await writeFile(OUTPUT_PATH, JSON.stringify(toilets, null, 2), 'utf8');
}

// ---- main ----

async function main() {
  const { toilets: existingToilets, scrapedIds, geocodedIds } = loadExistingOutput();
  console.log(`Loaded ${existingToilets.length} existing toilets (${geocodedIds.size} with coords).\n`);

  // Step 1: get districts
  console.log('=== Step 1: Fetching district list ===');
  const indexHtml = await fetchPage(`${BASE}/index.php`);
  const districts = parseDistrictIds(indexHtml);
  console.log(`Found ${districts.length} districts.\n`);

  const allToilets: ToiletOutput[] = [...existingToilets];
  let totalScraped = scrapedIds.size;
  let totalGeocodeFailures = 0;

  for (let di = 0; di < districts.length; di++) {
    const district = districts[di];
    console.log(`--- District ${di + 1}/${districts.length}: ${district.name} (id=${district.id}, ~${district.count}) ---`);
    await sleep(DELAY_MS);

    let listHtml: string;
    try {
      listHtml = await fetchPage(`${BASE}/district_list.php?id=${district.id}`);
    } catch (error) {
      console.error(`  Failed: ${error}`);
      continue;
    }

    const toiletList = parseToiletList(listHtml);
    console.log(`  ${toiletList.length} toilets listed.`);

    for (const toilet of toiletList) {
      // Skip already scraped
      if (scrapedIds.has(toilet.id)) {
        console.log(`  [${toilet.id}] ${toilet.name} — already scraped, skipping`);
        continue;
      }

      totalScraped++;
      console.log(`  [${toilet.id}] ${toilet.name} (${totalScraped} total)`);
      await sleep(DELAY_MS);

      // Fetch detail page
      let detailHtml: string;
      try {
        detailHtml = await fetchPage(`${BASE}/toilet_view.php?toilet_id=${toilet.id}`);
      } catch (error) {
        console.error(`    Failed to fetch detail: ${error}`);
        // Still save a partial record
        allToilets.push({
          nameZh: toilet.name,
          nameEn: '',
          districtZh: district.name,
          districtEn: '',
          addressZh: '',
          addressEn: '',
          latitude: 0,
          longitude: 0,
          openingHours: '',
          accessible: false,
          babyCare: false,
          cleanlinessScore: 3.0,
          tags: [],
          sourceId: toilet.id
        });
        await saveOutput(allToilets);
        scrapedIds.add(toilet.id);
        continue;
      }

      const detail = parseToiletDetail(detailHtml);
      const displayDistrict = detail.district || district.name;
      const displayAddress = detail.address || toilet.name;
      const gmQuery = detail.googleMapsQuery;

      console.log(`    District: ${displayDistrict}, Address: ${displayAddress}`);
      if (gmQuery) console.log(`    GM query: ${gmQuery}`);

      // Geocode — skip if already geocoded
      let coords: { lat: number; lng: number } | null = null;
      if (geocodedIds.has(toilet.id)) {
        const existing = existingToilets.find((t) => t.sourceId === toilet.id);
        if (existing) {
          coords = { lat: existing.latitude, lng: existing.longitude };
          console.log(`    Coords (cached): ${coords.lat}, ${coords.lng}`);
        }
      }

      if (!coords) {
        await sleep(1200);
        coords = await geocodeToilet(toilet.name, displayAddress, displayDistrict, gmQuery);

        if (!coords) {
          console.error(`    ⚠ Geocode failed`);
          totalGeocodeFailures++;
        } else {
          console.log(`    ✓ Coords: ${coords.lat}, ${coords.lng}`);
        }
      }

      allToilets.push({
        nameZh: toilet.name,
        nameEn: '',
        districtZh: displayDistrict,
        districtEn: '',
        addressZh: displayAddress,
        addressEn: '',
        latitude: coords?.lat ?? 0,
        longitude: coords?.lng ?? 0,
        openingHours: detail.hours,
        accessible: false,
        babyCare: false,
        cleanlinessScore: 3.0,
        tags: [],
        sourceId: toilet.id
      });

      scrapedIds.add(toilet.id);
      if (coords) geocodedIds.add(toilet.id);

      // Save after each toilet
      await saveOutput(allToilets);
    }
  }

  console.log(`\n=== Done! ${allToilets.length} toilets, ${totalGeocodeFailures} new geocode failures ===`);
  console.log(`Saved to ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
