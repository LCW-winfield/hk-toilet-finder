'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';

const MapView = dynamic(() => import('./map-view'), { ssr: false });

type ToiletRecord = {
  id: string;
  nameZh: string;
  nameEn: string | null;
  districtZh: string;
  districtEn: string | null;
  addressZh: string;
  addressEn: string | null;
  latitude: number;
  longitude: number;
  openingHours: string | null;
  accessible: boolean;
  babyCare: boolean;
  cleanlinessScore: number;
  tags: Array<{ id: string; tagKey: string }>;
};

type HomeClientProps = {
  toilets: ToiletRecord[];
};

function haversineDistance(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const core = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(core), Math.sqrt(1 - core));
}

const defaultLocation = { lat: 22.28198, lng: 114.15879 };

export function HomeClient({ toilets }: HomeClientProps) {
  const [locale, setLocale] = useState<Locale>('zh-HK');
  const [userLocation, setUserLocation] = useState(defaultLocation);
  const [selectedId, setSelectedId] = useState<string | null>(toilets[0]?.id ?? null);
  const [accessibleOnly, setAccessibleOnly] = useState(false);
  const [babyCareOnly, setBabyCareOnly] = useState(false);
  const [avoidOdor, setAvoidOdor] = useState(false);
  const [minCleanliness, setMinCleanliness] = useState(0);
  const [routeMeta, setRouteMeta] = useState('');

  const dict = translations[locale];

  // Auto-locate on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          // keep default location
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, []);

  function tagLabel(tagKey: string) {
    const lookup = translations[locale] as Record<string, unknown>;
    return (lookup[tagKey] as string) ?? tagKey;
  }

  const filtered = useMemo(() => {
    return toilets.filter((toilet) => {
      if (accessibleOnly && !toilet.accessible) return false;
      if (babyCareOnly && !toilet.babyCare) return false;
      if (avoidOdor && toilet.tags.some((tag) => tag.tagKey === 'odor')) return false;
      if (toilet.cleanlinessScore < minCleanliness) return false;
      return true;
    });
  }, [accessibleOnly, avoidOdor, babyCareOnly, minCleanliness, toilets]);

  const selected = filtered.find((t) => t.id === selectedId) ?? filtered[0] ?? null;

  const selectedDistance = selected
    ? haversineDistance(userLocation, { lat: selected.latitude, lng: selected.longitude })
    : 0;

  function handleSelectToilet(id: string) {
    setSelectedId(id);
    const toilet = toilets.find((t) => t.id === id);
    if (toilet) {
      const d = haversineDistance(userLocation, { lat: toilet.latitude, lng: toilet.longitude });
      setRouteMeta(dict.walkingDistance(d));
    }
  }

  function handleFindNearest() {
    if (filtered.length === 0) {
      setRouteMeta(dict.noResults);
      return;
    }

    const ranked = filtered
      .filter((toilet) => toilet.latitude !== 0 || toilet.longitude !== 0)
      .map((toilet) => {
        const distance = haversineDistance(userLocation, { lat: toilet.latitude, lng: toilet.longitude });
        const odorPenalty = toilet.tags.some((t) => t.tagKey === 'odor') ? 0.18 : 0;
        const cleanlinessPenalty = (5 - toilet.cleanlinessScore) * 0.08;
        return { toilet, score: distance + odorPenalty + cleanlinessPenalty, distance };
      })
      .sort((a, b) => a.score - b.score)[0];

    if (ranked) {
      setSelectedId(ranked.toilet.id);
      setRouteMeta(dict.nearestFound(ranked.distance));
    }
  }

  function handleResetRoute() {
    setSelectedId(null);
    setRouteMeta(dict.routeIdle);
  }

  function handleLocate() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(loc);
          handleFindNearest();
        },
        () => {
          setRouteMeta(dict.locateFallback);
          handleFindNearest();
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setRouteMeta(dict.locateUnsupported);
      handleFindNearest();
    }
  }

  const initialMeta =
    routeMeta || (selected ? dict.walkingDistance(selectedDistance) : dict.routeIdle);

  return (
    <div className="page-shell">
      {/* -------- SIDEBAR -------- */}
      <aside className="sidebar">
        {/* BRAND */}
        <section className="panel">
          <div className="meta-row">
            <div style={{ flex: 1 }}>
              <p className="eyebrow-text">{dict.eyebrow}</p>
              <h1>{dict.brand}</h1>
            </div>
            <button
              type="button"
              className="ghost-btn lang-btn"
              onClick={() => setLocale(locale === 'zh-HK' ? 'en' : 'zh-HK')}
            >
              {locale === 'zh-HK' ? 'EN' : '繁'}
            </button>
          </div>
          <p>{dict.intro}</p>
          <div className="list-column">
            <button type="button" className="primary-btn full-width" onClick={handleLocate}>
              {dict.findNearest}
            </button>
            <button type="button" className="ghost-btn full-width" onClick={handleResetRoute}>
              {dict.resetRoute}
            </button>
            <Link href="/submit" className="link-btn full-width">
              {dict.submitToilet}
            </Link>
          </div>
        </section>

        {/* FILTERS */}
        <section className="panel filter-group">
          <label>
            <input type="checkbox" checked={accessibleOnly} onChange={(e) => setAccessibleOnly(e.target.checked)} />
            <span>{dict.accessibleOnly}</span>
          </label>
          <label>
            <input type="checkbox" checked={babyCareOnly} onChange={(e) => setBabyCareOnly(e.target.checked)} />
            <span>{dict.babyCareOnly}</span>
          </label>
          <label>
            <input type="checkbox" checked={avoidOdor} onChange={(e) => setAvoidOdor(e.target.checked)} />
            <span>{dict.avoidOdor}</span>
          </label>
          <label>
            <span>
              {dict.minCleanliness} {minCleanliness.toFixed(1)}
            </span>
            <input type="range" min={0} max={5} step={0.5} value={minCleanliness} onChange={(e) => setMinCleanliness(Number(e.target.value))} />
          </label>
        </section>

        {/* RECOMMENDATION */}
        <section className="panel">
          <div className="panel-header-row">
            <h2>{dict.recommendation}</h2>
            <span className="muted-text">{initialMeta}</span>
          </div>
          {selected ? (
            <div className="selected-card">
              <h3>{locale === 'zh-HK' ? selected.nameZh : selected.nameEn ?? selected.nameZh}</h3>
              <p>{locale === 'zh-HK' ? selected.addressZh : selected.addressEn ?? selected.addressZh}</p>
              <div className="meta-row">
                <span className="score-pill">{dict.cleanlinessScore(selected.cleanlinessScore)}</span>
                <span className="meta-pill">{selected.openingHours ?? (locale === 'zh-HK' ? '未有開放時間' : 'Hours not listed')}</span>
                <span className="meta-pill">{selectedDistance.toFixed(2)} km</span>
              </div>
              <div className="tag-row">
                {selected.accessible && <span className="tag">{dict.accessibleEntrance}</span>}
                {selected.babyCare && <span className="tag">{dict.babyCare}</span>}
                {selected.tags.map((tag) => (
                  <span className="tag" key={tag.id}>{tagLabel(tag.tagKey)}</span>
                ))}
              </div>
              <a
                className="link-btn"
                target="_blank"
                rel="noreferrer"
                href={`https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=${userLocation.lat}%2C${userLocation.lng}%3B${selected.latitude}%2C${selected.longitude}`}
              >
                {dict.openDirections}
              </a>
            </div>
          ) : (
            <div className="selected-card empty-state">{dict.emptySelection}</div>
          )}
        </section>

        {/* LIST */}
        <section className="panel">
          <div className="panel-header-row">
            <h2>{dict.nearby}</h2>
            <span className="muted-text">{dict.listCount(filtered.length)}</span>
          </div>
          <div className="list-column">
            {filtered.map((toilet) => {
              const dist = haversineDistance(userLocation, { lat: toilet.latitude, lng: toilet.longitude });
              return (
                <button
                  key={toilet.id}
                  type="button"
                  className={`toilet-card ${selected?.id === toilet.id ? 'active' : ''}`}
                  onClick={() => handleSelectToilet(toilet.id)}
                >
                  <h3>{locale === 'zh-HK' ? toilet.nameZh : toilet.nameEn ?? toilet.nameZh}</h3>
                  <div className="meta-row">
                    <span className="meta-pill">{locale === 'zh-HK' ? toilet.districtZh : toilet.districtEn ?? toilet.districtZh}</span>
                    <span className="meta-pill">{dict.approxKm(dist)}</span>
                    <span className="score-pill">{dict.cleanlinessScore(toilet.cleanlinessScore)}</span>
                  </div>
                  <div className="tag-row">
                    {toilet.accessible && <span className="tag">{dict.accessible}</span>}
                    {toilet.babyCare && <span className="tag">{dict.babyCare}</span>}
                    {toilet.tags.map((tag) => (
                      <span className="tag" key={tag.id}>{tagLabel(tag.tagKey)}</span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </aside>

      {/* -------- MAP -------- */}
      <main className="map-pane">
        <section className="map-card">
          <MapView
            toilets={filtered}
            userLocation={userLocation}
            selectedToiletId={selectedId}
            onSelectToilet={handleSelectToilet}
          />
        </section>
      </main>
    </div>
  );
}
