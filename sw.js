// Service Worker — เสี่ยกร พารวย
// เวอร์ชัน: v1 — เปลี่ยนเลขนี้ทุกครั้งที่ update ไฟล์

const CACHE_NAME = 'korn-paruay-v1';

// ไฟล์ที่ต้องการให้ใช้งานได้แม้ไม่มีเน็ต
const STATIC_FILES = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&family=Noto+Sans+Thai:wght@400;500;700&display=swap'
];

// ===== INSTALL: cache ไฟล์หลักทั้งหมด =====
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_FILES))
      .then(() => self.skipWaiting())
  );
});

// ===== ACTIVATE: ลบ cache เก่าออก =====
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ===== FETCH: Network first, Cache fallback =====
// - Google Apps Script API: ใช้ network เสมอ (ข้อมูล realtime)
// - ไฟล์ static: ลอง network ก่อน ถ้าไม่มีเน็ตใช้ cache
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Apps Script API — ไม่ cache เด็ดขาด
  if (url.includes('script.google.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Google Fonts — cache เลย
  if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        return cached || fetch(event.request).then(resp => {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return resp;
        });
      })
    );
    return;
  }

  // ไฟล์ static ทั่วไป: network first
  event.respondWith(
    fetch(event.request)
      .then(resp => {
        if (resp && resp.status === 200) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return resp;
      })
      .catch(() => caches.match(event.request))
  );
});
