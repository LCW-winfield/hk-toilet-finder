import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';

const submissionSchema = z.object({
  submissionType: z.enum(['new', 'correction']),
  targetToiletId: z.string().optional().nullable(),
  nameZh: z.string().min(1),
  nameEn: z.string().optional().nullable(),
  addressZh: z.string().min(1),
  addressEn: z.string().optional().nullable(),
  districtZh: z.string().min(1),
  districtEn: z.string().optional().nullable(),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  openingHours: z.string().optional().nullable(),
  accessible: z.boolean().default(false),
  babyCare: z.boolean().default(false),
  note: z.string().optional().nullable()
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = submissionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid submission payload' }, { status: 400 });
  }

  // Map 'new' to 'new_toilet' since 'new' might conflict with reserved words
  const submission = await prisma.toiletSubmission.create({
    data: {
      submissionType: parsed.data.submissionType,
      targetToiletId: parsed.data.targetToiletId ?? null,
      nameZh: parsed.data.nameZh,
      nameEn: parsed.data.nameEn ?? null,
      addressZh: parsed.data.addressZh,
      addressEn: parsed.data.addressEn ?? null,
      districtZh: parsed.data.districtZh,
      districtEn: parsed.data.districtEn ?? null,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      openingHours: parsed.data.openingHours ?? null,
      accessible: parsed.data.accessible,
      babyCare: parsed.data.babyCare,
      note: parsed.data.note ?? null
    }
  });

  return NextResponse.json({ submission }, { status: 201 });
}
