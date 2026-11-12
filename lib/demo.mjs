import data from '../data/sydney.json' with { type: 'json' };

export const defaults = { nationality: '대한민국', purpose: 'working_holiday', visa_status: 'preparing', city: 'Sydney', arrival_date: '2027-02-01', workplace: 'Sydney CBD', company: '', monthly_budget: 3200, initial_budget: 6000, housing_type: 'any', max_commute: 45, insurance: null, sort_by: 'balanced' };
const oneOf = (v, choices) => choices.includes(v);
export function validateProfile(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('조건을 다시 입력해 주세요.');
  const p = { ...raw };
  for (const [key, min, max] of [['monthly_budget', 1, 100000], ['initial_budget', 1, 1000000], ['max_commute', 1, 180]]) {
    if (typeof p[key] !== 'number' || !Number.isFinite(p[key]) || p[key] < min || p[key] > max) throw new Error('예산과 통근시간을 올바른 숫자로 입력해 주세요.');
  }
  if (p.insurance !== null && (typeof p.insurance !== 'number' || !Number.isFinite(p.insurance) || p.insurance < 0 || p.insurance > 10000)) throw new Error('보험료를 확인해 주세요.');
  if (p.city !== 'Sydney' || !oneOf(p.workplace, ['Sydney CBD', 'Surry Hills', 'Parramatta'])) throw new Error('현재 시드니의 지정 근무 지역만 지원합니다.');
  if (!oneOf(p.purpose, ['working_holiday', 'employment', 'internship']) || !oneOf(p.visa_status, ['undecided', 'preparing', 'held']) || !oneOf(p.housing_type, ['any', 'share', 'studio']) || !oneOf(p.sort_by, ['balanced', 'cheapest', 'fastest'])) throw new Error('선택한 조건을 확인해 주세요.');
  if (typeof p.nationality !== 'string' || !p.nationality.trim() || p.nationality.length > 80 || typeof p.company !== 'string' || p.company.length > 120) throw new Error('국적 또는 회사명을 확인해 주세요.');
  if (typeof p.arrival_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(p.arrival_date) || !Number.isFinite(Date.parse(p.arrival_date)) || new Date(p.arrival_date).toISOString().slice(0,10) !== p.arrival_date) throw new Error('입국 예정일을 확인해 주세요.');
  return p;
}
const round = n => Math.round(n * 100) / 100;
export function buildPlan(raw) {
  const profile = validateProfile(raw);
  const guides = data.guides.filter(g => !g.purposes.length || g.purposes.includes(profile.purpose)).map(g => ({ ...g, title: g.id === 'visa' && profile.visa_status === 'held' ? '발급된 비자와 근로 조건 재확인' : g.title }));
  const candidates = data.housing.filter(h => profile.housing_type === 'any' || h.type === profile.housing_type).map(h => {
    const rent = round(h.weekly_rent * 52 / 12);
    const monthly = round(rent + h.monthly_transport + data.living_costs.food + data.living_costs.utilities + data.living_costs.phone + (profile.insurance ?? 0));
    const initial = round((h.bond ?? 0) + h.advance_rent + data.living_costs.moving);
    return { ...h, rent, monthly, initial, commute: h.commutes[profile.workplace], monthly_missing: profile.insurance === null ? ['의료·보험료'] : [], initial_missing: [...(h.bond === null ? ['보증금'] : []), '항공권', '비자 관련 비용', '기타 개인 정착 비용'], monthly_remaining: round(profile.monthly_budget - monthly), initial_remaining: round(profile.initial_budget - initial), is_demo: true, source_url: null, checked_at: data.version.slice(0, 10) };
  }).filter(h => h.commute <= profile.max_commute && h.monthly <= profile.monthly_budget && h.initial <= profile.initial_budget);
  candidates.sort((a,b) => (profile.sort_by === 'cheapest' ? a.monthly - b.monthly : profile.sort_by === 'fastest' ? a.commute - b.commute : a.monthly + a.commute * 10 - b.monthly - b.commute * 10) || a.id.localeCompare(b.id));
  const options = candidates.slice(0, 3);
  return { profile, options, guides, living_costs: data.living_costs, currency: 'AUD', data_version: data.version, mode: 'demo', explanation: options.length ? '입력한 예산·주거 형태·통근시간에 맞춰 가상 후보를 다시 계산했습니다. 알려진 비용 기준으로 비교하고, 미확인 비용은 별도로 확인해 주세요.' : '현재 조건에 맞는 후보가 없습니다. 월 예산·초기 예산을 늘리거나 통근시간·주거 형태 조건을 조정해 보세요.', warnings: ['모든 주거 후보·월세·통근시간·생활비는 시연용 가상 데이터이며 실제 매물·시세가 아닙니다.', '주간 월세는 주간 금액 × 52 ÷ 12로 월 환산합니다. 초기 비용은 보증금 + 선납 월세 + 이사비의 부분 합계이며 월 지출과 더하지 않습니다.', '의료·보험료, 항공권, 비자 및 기타 비용의 누락 여부를 확인하세요. 비자 자격은 판정하지 않습니다.'] };
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
