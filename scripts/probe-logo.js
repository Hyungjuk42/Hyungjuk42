// shields 로고 슬러그 후보를 하나씩 재서 실제로 박히는 이름을 찾는다.
const candidates = process.argv.slice(2);

(async () => {
  for (const slug of candidates) {
    const url = `https://img.shields.io/badge/test-000000?style=flat-square&logo=${encodeURIComponent(slug)}&logoColor=white`;
    try {
      const res = await fetch(url);
      const body = await res.text();
      const ok = body.includes('<image');
      console.log(`${ok ? 'HAS ' : 'none'} ${res.status}  ${slug}`);
    } catch (err) {
      console.log(`ERR       ${slug}  ${String(err)}`);
    }
  }
})();
