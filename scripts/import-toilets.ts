import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type RawToilet = {
  nameZh: string;
  nameEn?: string;
  districtZh: string;
  districtEn?: string;
  addressZh: string;
  addressEn?: string;
  latitude: number;
  longitude: number;
  openingHours?: string;
  accessible?: boolean;
  babyCare?: boolean;
  cleanlinessScore?: number;
  tags?: string[];
};

async function main() {
  const filePath = path.join(process.cwd(), 'data', 'raw', 'hong-kong-toilets.json');
  const file = await readFile(filePath, 'utf8');
  const toilets = JSON.parse(file) as RawToilet[];

  console.log(`Loaded ${toilets.length} toilets from JSON.`);

  // Clear existing data
  await prisma.toiletTag.deleteMany();
  await prisma.toiletSubmission.deleteMany();
  await prisma.toilet.deleteMany();

  let imported = 0;
  for (const toilet of toilets) {
    const skipCoords = toilet.latitude === 0 && toilet.longitude === 0;
    if (skipCoords) {
      console.log(`  NO-COORDS: ${toilet.nameZh}`);
    }

    await prisma.toilet.create({
      data: {
        nameZh: toilet.nameZh,
        nameEn: toilet.nameEn || null,
        districtZh: toilet.districtZh,
        districtEn: toilet.districtEn || null,
        addressZh: toilet.addressZh,
        addressEn: toilet.addressEn || null,
        latitude: toilet.latitude,
        longitude: toilet.longitude,
        openingHours: toilet.openingHours || null,
        accessible: Boolean(toilet.accessible),
        babyCare: Boolean(toilet.babyCare),
        cleanlinessScore: toilet.cleanlinessScore ?? 3.0,
        status: 'active',
        tags: {
          create: (toilet.tags ?? []).map((tagKey) => ({ tagKey }))
        }
      }
    });

    imported++;
  }

  console.log(`Imported ${imported} toilets into SQLite.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
