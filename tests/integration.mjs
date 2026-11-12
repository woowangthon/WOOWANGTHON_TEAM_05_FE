import assert from 'node:assert/strict';
import { defaults } from '../lib/demo.mjs';
const frontend = process.env.FRONTEND_TEST_URL ?? 'http://localhost:3000';
const backend = process.env.BACKEND_TEST_URL ?? 'http://localhost:8000';
const headers = { 'Content-Type': 'application/json', ...(process.env.BACKEND_API_KEY ? { 'X-API-Key': process.env.BACKEND_API_KEY } : {}) };
let cases = 0;
for (const workplace of ['Sydney CBD', 'Surry Hills', 'Parramatta']) {
  for (const sort_by of ['balanced', 'cheapest', 'fastest']) {
    for (const patch of [{}, { insurance: 100, housing_type: 'studio', max_commute: 60 }, { monthly_budget: 100 }]) {
      const profile = { ...defaults, workplace, sort_by, ...patch };
      const [a,b] = await Promise.all([
        fetch(frontend + '/api/plan', { method: 'POST', headers, body: JSON.stringify({ profile }) }),
        fetch(backend + '/api/plans', { method: 'POST', headers, body: JSON.stringify(profile) })
      ]);
      assert.equal(a.status, 200); assert.equal(b.status, 200);
      const [fe,be] = await Promise.all([a.json(), b.json()]);
      assert.deepEqual(fe.options, be.options); assert.deepEqual(fe.guides, be.guides);
      assert.equal(fe.data_version, be.data_version); cases++;
    }
  }
}
console.log(cases + ' cross-service contract cases passed');
