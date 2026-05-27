import { prisma } from '@/lib/prisma';

export type ToiletFilters = {
  accessible?: boolean;
  babyCare?: boolean;
  avoidOdor?: boolean;
  minCleanliness?: number;
};

export async function getToilets(filters: ToiletFilters = {}) {
  return prisma.toilet.findMany({
    where: {
      status: 'active',
      accessible: filters.accessible ? true : undefined,
      babyCare: filters.babyCare ? true : undefined,
      cleanlinessScore:
        typeof filters.minCleanliness === 'number'
          ? { gte: filters.minCleanliness }
          : undefined,
      tags: filters.avoidOdor
        ? { none: { tagKey: 'odor' } }
        : undefined
    },
    include: { tags: true },
    orderBy: [{ cleanlinessScore: 'desc' }, { districtZh: 'asc' }]
  });
}

export async function getToiletById(id: string) {
  return prisma.toilet.findUnique({
    where: { id },
    include: { tags: true }
  });
}

export function haversineDistance(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const core = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(core), Math.sqrt(1 - core));
}

export function rankNearestToilet(
  userLocation: { lat: number; lng: number },
  toilets: Array<{
    latitude: number;
    longitude: number;
    cleanlinessScore: number;
    tags: Array<{ tagKey: string }>;
  }>
) {
  return toilets
    .map((toilet) => {
      const distance = haversineDistance(userLocation, {
        lat: toilet.latitude,
        lng: toilet.longitude
      });
      const odorPenalty = toilet.tags.some((tag) => tag.tagKey === 'odor') ? 0.18 : 0;
      const cleanlinessBoost = (5 - toilet.cleanlinessScore) * 0.08;
      return { toilet, distance, score: distance + odorPenalty + cleanlinessBoost };
    })
    .sort((a, b) => a.score - b.score)[0];
}
