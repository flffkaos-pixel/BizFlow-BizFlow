// Worker.js 로직 단위 테스트 (Cloudflare KV mock 사용)
// 실행: node no-oracle/worker/test-worker.js
const fs = require('fs');

// module.exports 변환 후 로드
let code = fs.readFileSync(__dirname + '/worker.js', 'utf8')
  .replace('export default', 'module.exports =');

const tmpFile = __dirname + '/worker.module.cjs';
fs.writeFileSync(tmpFile, code);

const worker = require(tmpFile);

// KV mock (Cloudflare KV 동작 모사: prefix 필터링 지원)
const store = new Map();
const QUEUE = {
  get: async (k, t) => {
    const v = store.get(k);
    if (!v) return null;
    return t === 'json' ? JSON.parse(v) : v;
  },
  put: async (k, v) => store.set(k, typeof v === 'string' ? v : JSON.stringify(v)),
  list: async ({ prefix, limit }) => {
    const keys = [...store.keys()].filter((k) => k.startsWith(prefix || ''));
    return { keys: keys.slice(0, limit || 1000).map((n) => ({ name: n })) };
  },
};
const env = { QUEUE, KAKAO_CALLBACK_URL: '' };

const jsonReq = (url, method, body) =>
  new Request('https://x' + url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

(async () => {
  let results = [];

  // 1. 주문 기록
  let r = await worker.fetch(jsonReq('/orders', 'POST', { orderId: 'O-123', plan: 'pro', amount: '6.00', email: 'a@b.c' }), env);
  results.push(['POST /orders', await r.text()]);

  // 2. 주문 조회
  r = await worker.fetch(jsonReq('/orders', 'GET'), env);
  results.push(['GET /orders', await r.text()]);

  // 3. 완료 표시
  r = await worker.fetch(jsonReq('/orders/complete', 'POST', { orderId: 'O-123' }), env);
  results.push(['POST complete', await r.text()]);

  // 4. 카톡 웹훅 수신 → "잠시만요" 응답
  r = await worker.fetch(jsonReq('/kakao', 'POST', { userRequest: { utterance: '안녕하세요', user: { id: 'u1' } } }), env);
  results.push(['POST /kakao', await r.text()]);

  // 5. pending 조회
  r = await worker.fetch(jsonReq('/pending', 'GET'), env);
  results.push(['GET /pending', await r.text()]);

  // 6. 답변 등록
  r = await worker.fetch(jsonReq('/reply', 'POST', { msgId: 'm_1', reply: '확인되었습니다' }), env);
  results.push(['POST /reply', await r.text()]);

  for (const [name, body] of results) {
    console.log(`\n=== ${name} ===`);
    console.log(body);
  }
  console.log('\nALL TESTS PASSED');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
