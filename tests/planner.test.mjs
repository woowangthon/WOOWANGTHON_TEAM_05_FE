import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPlan, defaults, interpretDemo, validateProfile } from '../lib/demo.mjs';
test('weekly rent conversion, known subtotals and unknown costs stay explicit', () => {
  const p = buildPlan(defaults); const ash = p.options.find(x => x.id === 'cda-ashfield');
  assert.equal(ash.rent, 996.67); assert.equal(ash.monthly, 2243.34); assert.equal(ash.initial, 0);
  assert.deepEqual(ash.monthly_missing, ['의료·보험료']); assert.ok(ash.initial_missing.includes('항공권'));
  const red = p.options.find(x => x.id === 'cda-redfern'); assert.ok(red.initial_missing.includes('보증금')); assert.equal(red.bond, null);
  assert.ok(ash.initial_missing.includes('선납 월세')); assert.ok(ash.initial_missing.includes('이사비'));
  assert.equal(ash.utilities, 0); assert.equal(ash.is_demo, false); assert.match(ash.source_url, /^https:/);
});
test('filter budgets and commutes, empty state, and sort after revision', () => {
  assert.equal(buildPlan({ ...defaults, monthly_budget: 100 }).options.length, 0);
  assert.ok(buildPlan({ ...defaults, initial_budget: 100 }).options.every(h => h.initial_missing.includes('보증금')));
  const edit = interpretDemo('더 저렴하게, 통근 60분', defaults);
  assert.equal(edit.profile.max_commute, 60); assert.equal(buildPlan(edit.profile).options[0].id, 'cda-redfern');
  assert.ok(buildPlan({ ...defaults, max_commute: 20 }).options.every(x => x.commute === null || x.commute <= 20));
});
test('unknown commute and excluded utilities stay explicit for studio candidates', () => {
  const plan = buildPlan({...defaults, housing_type:'studio', monthly_budget:10000, max_commute:1});
  assert.equal(plan.options.length, 2);
  for (const h of plan.options) {
    assert.equal(h.commute, null); assert.equal(h.commute_verified, false);
    assert.equal(h.utilities, null); assert.ok(h.monthly_missing.includes('공과금'));
  }
});
test('reject invalid inputs and unsupported demo instructions', () => {
  for (const patch of [{ monthly_budget: NaN }, { insurance: -1 }, { workplace: 'Melbourne' }, { monthly_budget: '3000' }, { arrival_date: '2027-02-30' }]) assert.throws(() => validateProfile({ ...defaults, ...patch }));
  assert.throws(() => interpretDemo('아무렇게나 해', defaults));
});
test('purpose and visa status change checklist; supplied insurance completes monthly subtotal', () => {
  assert.ok(!buildPlan({ ...defaults, purpose: 'employment' }).guides.some(g => g.id === 'visa'));
  assert.ok(buildPlan({ ...defaults, visa_status: 'held' }).guides.find(g => g.id === 'visa').title.includes('재확인'));
  assert.deepEqual(buildPlan({ ...defaults, insurance: 100 }).options[0].monthly_missing, []);
});
