// 임의 URL 들의 상태코드를 잰다. 외부 서비스가 살아 있는지 확인용.
(async () => {
  for (const url of process.argv.slice(2)) {
    try {
      const res = await fetch(url, { redirect: 'follow' });
      const text = await res.text();
      console.log(`${res.status} len=${text.length}  ${url.slice(0, 90)}`);
    } catch (err) {
      console.log(`ERR ${String(err).slice(0, 80)}  ${url.slice(0, 90)}`);
    }
  }
})();
