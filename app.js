const toilets = [
  {
    id: 1,
    name: '中環碼頭公廁',
    district: '中西區',
    address: '中環 7 號碼頭附近',
    lat: 22.28762,
    lng: 114.15892,
    accessible: true,
    babyCare: true,
    openingHours: '24 小時',
    cleanliness: 4.4,
    tags: ['clean', 'tidy']
  },
  {
    id: 2,
    name: '金鐘夏慤花園公廁',
    district: '中西區',
    address: '金鐘夏慤花園旁',
    lat: 22.27984,
    lng: 114.16527,
    accessible: true,
    babyCare: false,
    openingHours: '06:00 - 23:00',
    cleanliness: 4.1,
    tags: ['tidy', 'ventilated']
  },
  {
    id: 3,
    name: '銅鑼灣維園公廁',
    district: '灣仔區',
    address: '維多利亞公園近興發街',
    lat: 22.28376,
    lng: 114.19137,
    accessible: true,
    babyCare: true,
    openingHours: '24 小時',
    cleanliness: 4.7,
    tags: ['clean', 'tidy', 'spacious']
  },
  {
    id: 4,
    name: '尖沙咀文化中心公廁',
    district: '油尖旺區',
    address: '梳士巴利道文化中心外',
    lat: 22.29372,
    lng: 114.17395,
    accessible: false,
    babyCare: false,
    openingHours: '07:00 - 23:00',
    cleanliness: 3.7,
    tags: ['busy', 'odor']
  },
  {
    id: 5,
    name: '旺角花墟公廁',
    district: '油尖旺區',
    address: '花墟道近園圃街',
    lat: 22.32419,
    lng: 114.17246,
    accessible: false,
    babyCare: false,
    openingHours: '05:30 - 22:30',
    cleanliness: 3.3,
    tags: ['odor', 'busy']
  }
];

const translations = {
  'zh-HK': {
    htmlLang: 'zh-HK',
    toggle: 'EN',
    eyebrow: 'Hong Kong Public Toilets',
    brandTitle: '香港搵公廁',
    intro: '即時查看附近公廁、自動推薦最近路線，並用清晰標籤快速判斷是否適合使用。',
    locateBtn: '查找最近公廁',
    resetBtn: '重設路線',
    accessibleOnly: '只看無障礙',
    babyCareOnly: '只看母嬰友善',
    minScoreLabel: '最低整潔度',
    recommendationTitle: '推薦結果',
    nearbyTitle: '附近公廁',
    routeIdle: '未開始導航',
    selectedEmpty: '點地圖上的公廁，或點擊「查找最近公廁」。',
    mapPopupYou: '你目前位置',
    popupCleanliness: '整潔度',
    listCount: (count) => `${count} 個結果`,
    approxKm: (distance) => `約 ${distance.toFixed(2)} km`,
    cleanlinessScore: (score) => `整潔 ${score.toFixed(1)}`,
    accessibleTag: '無障礙',
    accessibleEntranceTag: '無障礙入口',
    babyCareTag: '母嬰友善',
    openRouteLink: '在 OSM 開啟步行導航',
    routeCandidate: (distance) => `步行候選距離 ${distance.toFixed(2)} km`,
    noResults: '目前篩選條件下沒有結果',
    nearestFound: (distance) => `已推薦最近可用公廁，約 ${distance.toFixed(2)} km`,
    locateFallback: '未取得定位，已用香港預設位置示範',
    locateUnsupported: '裝置不支援定位，已用預設位置示範',
    tagsTitle: '公廁標籤',
    clean: '乾淨',
    tidy: '整潔',
    odor: '有異味',
    busy: '人流較多',
    ventilated: '通風較好',
    spacious: '空間較闊'
  },
  en: {
    htmlLang: 'en',
    toggle: '繁',
    eyebrow: 'Hong Kong Public Toilets',
    brandTitle: 'HK Toilet Finder',
    intro: 'Find nearby public toilets, get the nearest route automatically, and use clear tags to judge whether a stop suits you.',
    locateBtn: 'Find nearest toilet',
    resetBtn: 'Reset route',
    accessibleOnly: 'Accessible only',
    babyCareOnly: 'Baby-care friendly only',
    minScoreLabel: 'Minimum cleanliness',
    recommendationTitle: 'Recommendation',
    nearbyTitle: 'Nearby toilets',
    routeIdle: 'Navigation not started',
    selectedEmpty: 'Tap a toilet on the map, or choose “Find nearest toilet”.',
    mapPopupYou: 'Your current location',
    popupCleanliness: 'Cleanliness',
    listCount: (count) => `${count} results`,
    approxKm: (distance) => `${distance.toFixed(2)} km away`,
    cleanlinessScore: (score) => `Cleanliness ${score.toFixed(1)}`,
    accessibleTag: 'Accessible',
    accessibleEntranceTag: 'Accessible entrance',
    babyCareTag: 'Baby care',
    openRouteLink: 'Open walking directions in OSM',
    routeCandidate: (distance) => `Candidate walking distance ${distance.toFixed(2)} km`,
    noResults: 'No toilets match the current filters',
    nearestFound: (distance) => `Nearest available toilet selected, about ${distance.toFixed(2)} km away`,
    locateFallback: 'Location unavailable, showing the Hong Kong demo position',
    locateUnsupported: 'Geolocation is not supported, showing the default demo position',
    tagsTitle: 'Toilet tags',
    clean: 'Clean',
    tidy: 'Tidy',
    odor: 'Odor noted',
    busy: 'Often busy',
    ventilated: 'Well ventilated',
    spacious: 'Spacious'
  }
};

const state = {
  userLocation: { lat: 22.28198, lng: 114.15879 },
  selectedToiletId: null,
  activeRoute: null,
  markers: [],
  locale: 'zh-HK'
};

const routeMeta = document.getElementById('routeMeta');
const selectedToiletEl = document.getElementById('selectedToilet');
const toiletListEl = document.getElementById('toiletList');
const listCountEl = document.getElementById('listCount');
const minScoreEl = document.getElementById('minScore');
const minScoreValueEl = document.getElementById('minScoreValue');
const accessibleOnlyEl = document.getElementById('accessibleOnly');
const babyCareOnlyEl = document.getElementById('babyCareOnly');
const locateBtn = document.getElementById('locateBtn');
const resetBtn = document.getElementById('resetBtn');
const languageToggleBtn = document.getElementById('languageToggle');
const translatableNodes = document.querySelectorAll('[data-i18n]');

function t(key, ...args) {
  const value = translations[state.locale][key];
  return typeof value === 'function' ? value(...args) : value;
}

function translateTags(tags) {
  return tags.map((tag) => `<span class="tag">${t(tag)}</span>`).join('');
}

function applyTranslations() {
  document.documentElement.lang = translations[state.locale].htmlLang;
  translatableNodes.forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  languageToggleBtn.textContent = t('toggle');
  if (!state.selectedToiletId && !state.activeRoute) {
    routeMeta.textContent = t('routeIdle');
  }
}

const map = L.map('map').setView([state.userLocation.lat, state.userLocation.lng], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const userIcon = L.divIcon({
  className: 'user-marker',
  html: '<div style="width:18px;height:18px;background:#1565c0;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 6px rgba(21,101,192,0.18);"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

const toiletIcon = L.divIcon({
  className: 'toilet-marker',
  html: '<div style="width:18px;height:18px;background:#16a34a;border:3px solid #fff;border-radius:50%;box-shadow:0 8px 18px rgba(22,163,74,0.32);"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

const userMarker = L.marker([state.userLocation.lat, state.userLocation.lng], { icon: userIcon }).addTo(map);
userMarker.bindPopup(t('mapPopupYou'));

function haversineDistance(a, b) {
  const toRad = (value) => (value * Math.PI) / 180;
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

function getFilteredToilets() {
  const minScore = Number(minScoreEl.value);
  return toilets.filter((toilet) => {
    if (accessibleOnlyEl.checked && !toilet.accessible) return false;
    if (babyCareOnlyEl.checked && !toilet.babyCare) return false;
    if (toilet.cleanliness < minScore) return false;
    return true;
  });
}

function renderMarkers() {
  state.markers.forEach((marker) => marker.remove());
  state.markers = [];

  getFilteredToilets().forEach((toilet) => {
    const marker = L.marker([toilet.lat, toilet.lng], { icon: toiletIcon }).addTo(map);
    marker.on('click', () => selectToilet(toilet.id));
    marker.bindPopup(`<strong>${toilet.name}</strong><br/>${t('popupCleanliness')} ${toilet.cleanliness.toFixed(1)} / 5`);
    state.markers.push(marker);
  });
}

function renderToiletList() {
  const filtered = getFilteredToilets()
    .map((toilet) => ({ ...toilet, distance: haversineDistance(state.userLocation, toilet) }))
    .sort((a, b) => a.distance - b.distance);

  listCountEl.textContent = t('listCount', filtered.length);

  toiletListEl.innerHTML = filtered
    .map(
      (toilet) => `
        <article class="toilet-card ${toilet.id === state.selectedToiletId ? 'active' : ''}" data-id="${toilet.id}">
          <h3>${toilet.name}</h3>
          <div class="meta-row">
            <span class="meta-pill">${toilet.district}</span>
            <span class="meta-pill">${t('approxKm', toilet.distance)}</span>
            <span class="score-pill">${t('cleanlinessScore', toilet.cleanliness)}</span>
          </div>
          <div class="tag-row">
            ${toilet.accessible ? `<span class="tag">${t('accessibleTag')}</span>` : ''}
            ${toilet.babyCare ? `<span class="tag">${t('babyCareTag')}</span>` : ''}
            ${translateTags(toilet.tags)}
          </div>
        </article>
      `
    )
    .join('');

  toiletListEl.querySelectorAll('.toilet-card').forEach((card) => {
    card.addEventListener('click', () => selectToilet(Number(card.dataset.id)));
  });
}

function renderSelectedToilet(toilet, distanceKm) {
  if (!toilet) {
    selectedToiletEl.className = 'selected-card empty-state';
    selectedToiletEl.textContent = t('selectedEmpty');
    return;
  }

  selectedToiletEl.className = 'selected-card';
  selectedToiletEl.innerHTML = `
    <h3>${toilet.name}</h3>
    <p>${toilet.address}</p>
    <div class="score-row">
      <span class="score-pill">${t('cleanlinessScore', toilet.cleanliness)}</span>
      <span class="meta-pill">${toilet.openingHours}</span>
      <span class="meta-pill">${distanceKm.toFixed(2)} km</span>
    </div>
    <div class="tag-row">
      ${toilet.accessible ? `<span class="tag">${t('accessibleEntranceTag')}</span>` : ''}
      ${toilet.babyCare ? `<span class="tag">${t('babyCareTag')}</span>` : ''}
      ${translateTags(toilet.tags)}
    </div>
    <a class="route-link" target="_blank" rel="noreferrer" href="https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=${state.userLocation.lat}%2C${state.userLocation.lng}%3B${toilet.lat}%2C${toilet.lng}">${t('openRouteLink')}</a>
  `;
}

function drawRoute(toilet) {
  if (state.activeRoute) {
    state.activeRoute.remove();
  }

  const line = [
    [state.userLocation.lat, state.userLocation.lng],
    [toilet.lat, toilet.lng]
  ];

  state.activeRoute = L.polyline(line, {
    color: '#1565c0',
    weight: 5,
    opacity: 0.9,
    dashArray: '10, 8'
  }).addTo(map);

  map.fitBounds(state.activeRoute.getBounds(), { padding: [40, 40] });
}

function selectToilet(toiletId) {
  const toilet = toilets.find((item) => item.id === toiletId);
  if (!toilet) return;

  state.selectedToiletId = toiletId;
  const distanceKm = haversineDistance(state.userLocation, toilet);
  routeMeta.textContent = t('routeCandidate', distanceKm);
  renderSelectedToilet(toilet, distanceKm);
  renderToiletList();
  drawRoute(toilet);
}

function chooseNearestToilet() {
  const filtered = getFilteredToilets();
  if (!filtered.length) {
    routeMeta.textContent = t('noResults');
    renderSelectedToilet(null);
    return;
  }

  const ranked = filtered
    .map((toilet) => {
      const distance = haversineDistance(state.userLocation, toilet);
      const tagPenalty = toilet.tags.includes('odor') ? 0.18 : 0;
      return {
        toilet,
        score: distance + tagPenalty,
        distance
      };
    })
    .sort((a, b) => a.score - b.score)[0];

  routeMeta.textContent = t('nearestFound', ranked.distance);
  selectToilet(ranked.toilet.id);
}

function resetRoute() {
  state.selectedToiletId = null;
  routeMeta.textContent = t('routeIdle');
  if (state.activeRoute) {
    state.activeRoute.remove();
    state.activeRoute = null;
  }
  renderSelectedToilet(null);
  renderToiletList();
  map.setView([state.userLocation.lat, state.userLocation.lng], 13);
}

[minScoreEl, accessibleOnlyEl, babyCareOnlyEl].forEach((control) => {
  control.addEventListener('input', () => {
    minScoreValueEl.textContent = Number(minScoreEl.value).toFixed(1);
    renderMarkers();
    renderToiletList();
    if (state.selectedToiletId && !getFilteredToilets().some((item) => item.id === state.selectedToiletId)) {
      resetRoute();
    }
  });
});

locateBtn.addEventListener('click', () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        state.userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        userMarker.setLatLng([state.userLocation.lat, state.userLocation.lng]);
        userMarker.bindPopup(t('mapPopupYou'));
        map.setView([state.userLocation.lat, state.userLocation.lng], 14);
        chooseNearestToilet();
        renderToiletList();
      },
      () => {
        routeMeta.textContent = t('locateFallback');
        chooseNearestToilet();
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  } else {
    routeMeta.textContent = t('locateUnsupported');
    chooseNearestToilet();
  }
});

languageToggleBtn.addEventListener('click', () => {
  state.locale = state.locale === 'zh-HK' ? 'en' : 'zh-HK';
  applyTranslations();
  userMarker.bindPopup(t('mapPopupYou'));
  renderMarkers();
  renderToiletList();
  const selectedToilet = toilets.find((item) => item.id === state.selectedToiletId);
  renderSelectedToilet(selectedToilet || null, selectedToilet ? haversineDistance(state.userLocation, selectedToilet) : 0);
  if (selectedToilet) {
    routeMeta.textContent = t('routeCandidate', haversineDistance(state.userLocation, selectedToilet));
  }
});

resetBtn.addEventListener('click', resetRoute);
minScoreValueEl.textContent = Number(minScoreEl.value).toFixed(1);
applyTranslations();
renderMarkers();
renderToiletList();
renderSelectedToilet(null);
