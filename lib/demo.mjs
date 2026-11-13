import data from '../data/sydney.json' with { type: 'json' };

export const defaults = { nationality: '대한민국', purpose: 'working_holiday', visa_status: 'preparing', city: 'Sydney', arrival_date: '2027-02-01', workplace: 'Sydney CBD', company: '', monthly_budget: 3200, initial_budget: 6000, housing_type: 'any', max_commute: 45, insurance: null, sort_by: 'balanced' };
const oneOf = (v, choices) => choices.includes(v);
export function validateProfile(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('조건을 다시 입력해 주세요.');
  const p = { ...raw };
  for (const [key, min, max] of [['monthly_budget', 1, 100000], ['initial_budget', 1, 1000000], ['max_commute', 1, 180]]) {
    if (typeof p[key] !== 'number' || !Number.isFinite(p[key]) || p[key] < min || p[key] > max) throw new Error('예산과 통근시간을 올바른 숫자로 입력해 주세요.');
  }
  if (!Number.isInteger(p.max_commute)) throw new Error('통근시간은 정수 분으로 입력해 주세요.');
  if (p.insurance !== null && (typeof p.insurance !== 'number' || !Number.isFinite(p.insurance) || p.insurance < 0 || p.insurance > 10000)) throw new Error('보험료를 확인해 주세요.');
  if (p.city !== 'Sydney' || !oneOf(p.workplace, ['Sydney CBD', 'Surry Hills', 'Parramatta'])) throw new Error('현재 시드니의 지정 근무 지역만 지원합니다.');
  if (!oneOf(p.purpose, ['working_holiday', 'employment', 'internship']) || !oneOf(p.visa_status, ['undecided', 'preparing', 'held']) || !oneOf(p.housing_type, ['any', 'share', 'studio']) || !oneOf(p.sort_by, ['balanced', 'cheapest', 'fastest'])) throw new Error('선택한 조건을 확인해 주세요.');
  if (typeof p.nationality !== 'string' || !p.nationality.trim() || p.nationality.length > 80 || typeof p.company !== 'string' || p.company.length > 120) throw new Error('국적 또는 회사명을 확인해 주세요.');
  if (typeof p.arrival_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(p.arrival_date) || !Number.isFinite(Date.parse(p.arrival_date)) || new Date(p.arrival_date).toISOString().slice(0,10) !== p.arrival_date) throw new Error('입국 예정일을 확인해 주세요.');
  return p;
}
const round = n => Math.round((n + Number.EPSILON) * 100) / 100;
export function buildPlan(raw) {
  const profile = validateProfile(raw);
  const guides = data.guides.filter(g => !g.purposes.length || g.purposes.includes(profile.purpose)).map(g => ({ ...g, title: g.id === 'visa' && profile.visa_status === 'held' ? '발급된 비자와 근로 조건 재확인' : g.title }));
  const candidates = data.housing.filter(h => profile.housing_type === 'any' || h.type === profile.housing_type).map(h => {
    const rent = round(h.weekly_rent * 52 / 12);
    const utilities = h.bills_included ? 0 : data.living_costs.utilities;
    const monthly = round(rent + h.monthly_transport + data.living_costs.food + (utilities ?? 0) + data.living_costs.phone + (profile.insurance ?? 0));
    const initial = round((h.bond ?? 0) + (h.advance_rent ?? 0) + (data.living_costs.moving ?? 0));
    const commute = h.commutes[profile.workplace];
    return { ...h, rent, monthly, initial, utilities, commute, commute_verified: commute !== null,
      monthly_missing: [...(profile.insurance === null ? ['의료·보험료'] : []), ...(utilities === null ? ['공과금'] : [])],
      initial_missing: [...(h.bond === null ? ['보증금'] : []), ...(h.advance_rent === null ? ['선납 월세'] : []), ...(data.living_costs.moving === null ? ['이사비'] : []), '항공권', '비자 관련 비용', '기타 개인 정착 비용'],
      monthly_remaining: round(profile.monthly_budget - monthly), initial_remaining: round(profile.initial_budget - initial) };
  }).filter(h => (h.commute === null || h.commute <= profile.max_commute) && h.monthly <= profile.monthly_budget && h.initial <= profile.initial_budget);
  const score = h => profile.sort_by === 'cheapest' ? h.monthly : profile.sort_by === 'fastest' ? (h.commute ?? 10000) : h.monthly + (h.commute ?? 10000) * 10;
  candidates.sort((a,b) => score(a) - score(b) || a.id.localeCompare(b.id));
  const options = candidates.slice(0, 3);
  return { profile, options, guides, living_costs: data.living_costs, cost_sources: data.cost_sources, currency: 'AUD', data_version: data.version, mode: 'rules',
    explanation: options.length ? '공개 요금과 참고 예산으로 비교했습니다. 시작 요금은 확정 견적이 아니며 통근 미확인 후보는 조건 충족 여부를 확인해야 합니다.' : '현재 조건에 맞는 후보가 없습니다. 예산·통근시간·주거 형태를 조정해 보세요.',
    warnings: ['운영사 공개 요금 스냅샷입니다. 지역 시작 요금은 특정 공실이 아니며 계약 가격·입주 가능일은 원문에서 재확인하세요.',
      '통근시간은 운영사 지역→CBD 참고치입니다. 미확인 경로도 후보로 표시하며 최대 통근 조건을 충족한다고 보장하지 않습니다.',
      '식비·통신비는 대학 안내 범위의 하한, 교통비는 Opal 주간 상한의 월 환산 예산입니다. 개인 지출과 다를 수 있습니다.',
      '주간 월세는 주간 금액 × 52 ÷ 12로 월 환산합니다. 초기 비용은 보증금·선납 월세·이사비의 부분 합계이며 월 지출과 더하지 않습니다.',
      '의료·보험료, 항공권, 비자 및 기타 비용의 누락 여부를 확인하세요. 비자 자격은 판정하지 않습니다.'] };
}

// Deliberately narrow, transparent demo commands. Arbitrary language is handled by Gemma in the AI service.
export function interpretDemo(message, profile) {
  if (typeof message !== 'string' || !message.trim() || message.length > 1000) throw new Error('변경 요청은 1~1,000자로 입력해 주세요.');
  const patch = {};
  if (/저렴|싸게|절약/.test(message)) patch.sort_by = 'cheapest';
  if (/빠르|빠른|가까운|짧은/.test(message)) patch.sort_by = 'fastest';
  if (/쉐어|셰어/.test(message)) patch.housing_type = 'share';
  if (/스튜디오|원룸/.test(message)) patch.housing_type = 'studio';
  if (/형태.*무관|모든.*주거/.test(message)) patch.housing_type = 'any';
  const commute = message.match(/(?:통근|출퇴근)\s*(\d+)\s*분/);
  const budget = message.match(/월\s*예산\s*(\d+(?:\.\d+)?)\s*(?:AUD|달러)?/i);
  if (commute) patch.max_commute = Number(commute[1]);
  if (budget) patch.monthly_budget = Number(budget[1]);
  if (!Object.keys(patch).length) throw new Error('데모에서는 “더 저렴하게”, “통근 60분”, “월 예산 3000”, “쉐어룸”처럼 요청하거나 입력 폼을 수정해 주세요. 자유로운 조건 해석은 Gemma 연결 후 사용할 수 있습니다.');
  return { profile: validateProfile({ ...profile, ...patch }), changes: patch };
}
