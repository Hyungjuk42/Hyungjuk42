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

// --- 대비 계산 (WCAG) ---
// shields 는 배지 배경이 밝아도 흰 글씨를 쓴다. 밝은 배경색을 고르면 글자가 조용히 안 읽힌다.
// 200 응답과 "읽힌다" 는 다른 사실이라 여기서 따로 잰다. 본문 기준 AA = 4.5:1.
const MIN_CONTRAST = 4.5;

function luminance(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(full.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// 우리가 고른 테마색은 실패로 막는다. 기술 스택 배지는 브랜드 공식색이라
// 대비가 낮아도 임의로 바꾸지 않는다 — 대신 경고로 남겨 눈에 보이게 한다.
const THEME_COLORS = ['0e7490', '00d8ff'];

function badgeContrast(url, svg) {
  if (!url.includes('img.shields.io/badge/')) return null;
  const slug = url.split('/badge/')[1].split('?')[0];
  const bg = slug.split('-').pop();
  if (!/^[0-9a-fA-F]{3,6}$/.test(bg)) return null;
  const fg = svg.match(/<g[^>]*fill="(#[0-9a-fA-F]{3,6})"/)?.[1];
  if (!fg) return null;
  return {
    ratio: contrast(fg, `#${bg}`),
    fg,
    bg: `#${bg}`,
    enforced: THEME_COLORS.includes(bg.toLowerCase()),
  };
}

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
    contrast: badgeContrast(url, body),
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
  let warned = 0;
  for (const r of results) {
    const logo =
      r.logoRendered === null ? '' : r.logoRendered ? ' logo=ok' : ' logo=MISSING';
    const low = r.contrast && r.contrast.ratio < MIN_CONTRAST;
    const blocking = low && r.contrast.enforced;
    const cr = r.contrast ? ` ${r.contrast.ratio.toFixed(2)}:1${low ? '!' : ''}` : '';
    const flag = r.ok && r.logoRendered !== false && !blocking ? 'PASS' : 'FAIL';
    if (flag === 'FAIL') bad += 1;
    if (low && !blocking) warned += 1;
    console.log(`${flag} ${r.status}${logo}${cr}  ${r.url.slice(0, 100)}`);
  }
  if (warned) {
    console.log(
      `\n주의: 브랜드 공식색 배지 ${warned}개가 흰 글씨 기준 ${MIN_CONTRAST}:1 미만입니다 (표시 뒤 ! 표). ` +
        'shields 는 배경 밝기와 무관하게 흰 글씨를 써서, 밝은 브랜드색은 글자가 흐려집니다.',
    );
  }
  console.log(`\nchecked=${results.length} failed=${bad}`);
  process.exit(bad === 0 ? 0 : 1);
})();
