import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getToilets } from '@/lib/toilets';

const querySchema = z.object({
  accessible: z.enum(['true', 'false']).optional(),
  babyCare: z.enum(['true', 'false']).optional(),
  avoidOdor: z.enum(['true', 'false']).optional(),
  minCleanliness: z.coerce.number().min(0).max(5).optional()
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    accessible: url.searchParams.get('accessible') ?? undefined,
    babyCare: url.searchParams.get('babyCare') ?? undefined,
    avoidOdor: url.searchParams.get('avoidOdor') ?? undefined,
    minCleanliness: url.searchParams.get('minCleanliness') ?? undefined
  });

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
  }

  const toilets = await getToilets({
    accessible: parsed.data.accessible === 'true',
    babyCare: parsed.data.babyCare === 'true',
    avoidOdor: parsed.data.avoidOdor === 'true',
    minCleanliness: parsed.data.minCleanliness
  });

  return NextResponse.json({ toilets });
}
