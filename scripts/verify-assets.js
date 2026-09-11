// README 안의 모든 이미지 URL 이 실제로 살아 있는지 재는 스크립트.
// 로고가 붙는 shields 배지는 응답 본문에 로고가 실제로 박혔는지까지 확인한다.
// (shields 는 슬러그가 틀려도 200 을 주고 로고만 조용히 빠뜨린다 — 상태코드만으로는 못 잡는다)
const fs = require('fs');
const path = require('path');

// HTML 주석 안의 URL 은 화면에 안 뜨므로 검사 대상이 아니다.
// (빼놓지 않으면 일부러 꺼둔 블록 때문에 검사가 영영 빨갛다 — 아무것도 못 재는 검사가 된다)
const readme = fs
  .readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8')
  .replace(/<!--[\s\S]*?-->/g, '');

const urls = new Set();
for (const m of readme.matchAll(/(?:src|srcset)="([^"]+)"/g)) urls.add(m[1]);
for (const m of readme.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)) urls.add(m[1]);

const list = [...urls].filter((u) => u.startsWith('http'));

async function check(url) {
  const res = await fetch(url, { redirect: 'follow' });
  const body = res.headers.get('content-type')?.includes('image/svg')
    ? await res.text()
    : '';
  const wantsLogo = /[?&]logo=/.test(url);
  const hasLogo = body.includes('<image') || body.includes('<path d=');
  return {
    url,
    status: res.status,
    ok: res.ok,
    wantsLogo,
    logoRendered: wantsLogo ? hasLogo : null,
  };
}

(async () => {
  const results = [];
  for (const url of list) {
    try {
      results.push(await check(url));
    } catch (err) {
      results.push({ url, status: 'ERR', ok: false, error: String(err) });
    }
  }

  let bad = 0;
  for (const r of results) {
    const logo =
      r.logoRendered === null ? '' : r.logoRendered ? ' logo=ok' : ' logo=MISSING';
    const flag = r.ok && r.logoRendered !== false ? 'PASS' : 'FAIL';
    if (flag === 'FAIL') bad += 1;
    console.log(`${flag} ${r.status}${logo}  ${r.url.slice(0, 110)}`);
  }
  console.log(`\nchecked=${results.length} failed=${bad}`);
  process.exit(bad === 0 ? 0 : 1);
})();
