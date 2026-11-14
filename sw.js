// 只缓存网页外壳（断网也能打开）；数据每次都从网上读，读不到时网页自己显示上次的数据
// 11/14 用户：网页卡 → 打开 APP 时先上网拿新网页，1.5 秒没拿到就先用手机里存的（网上那份照样存起来，下次就是新的）；
//   换版本靠网页里的 checkUpdate（发现 sw.js 版本变了就重新载入）。
//   kz-data＝网页自己存的营业额历史（换版本时不删）。
const V = 'kongzhuo-v27';
const KEEP = ['kz-data'];
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && !KEEP.includes(k)).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;  // 数据接口不经过缓存
  if (u.pathname.endsWith('/sw.js')) return;   // 查新版本用的，永远直接上网（不能拿到存着的旧版本号）
  // cache:'no-cache'：每次都问服务器有没有新版（否则 GitHub 的 10 分钟缓存会让改版晚到）
  const net = fetch(e.request, { cache: 'no-cache' }).then(r => {
    if (r && r.ok) { const copy = r.clone(); caches.open(V).then(c => c.put(e.request, copy)); }
    return r;
  });
  e.waitUntil(net.then(() => {}, () => {}));
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => {
    const fallback = hit || caches.match('./index.html');
    if (!hit) return net.catch(() => fallback);
    return Promise.race([net.catch(() => hit), new Promise(res => setTimeout(() => res(hit), 1500))]);
  }));
});
