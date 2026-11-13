// Imported only by the server route. Never import this module into a client component.
import { buildPlan, validateProfile } from './demo.mjs';

const fields = ['monthly_budget', 'initial_budget', 'max_commute', 'housing_type', 'sort_by', 'insurance', 'workplace'];
export class GemmaError extends Error {}
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export function validateChanges(result, profile) {
  if (!object(result) || Object.keys(result).some(k => k !== 'changes') || !object(result.changes)) throw new GemmaError('Gemma 조건 응답 형식이 올바르지 않습니다.');
  const changes = {};
  for (const [key, value] of Object.entries(result.changes)) {
    if (!fields.includes(key)) throw new GemmaError('Gemma가 지원하지 않는 조건을 반환했습니다.');
    if (value !== null) changes[key] = value;
  }
  if (!Object.keys(changes).length) throw new GemmaError('변경할 예산·통근시간·주거 형태를 구체적으로 입력해 주세요.');
  try { validateProfile({ ...profile, ...changes }); }
  catch { throw new GemmaError('Gemma가 유효하지 않은 조건을 반환했습니다.'); }
  return changes;
}

async function generate(instruction, payload) {
  const key = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.GEMMA_MODEL || 'gemma-4-26b-a4b-it';
  if (!key || !['gemma-4-26b-a4b-it', 'gemma-4-31b-it'].includes(model)) throw new GemmaError('서버의 Gemma 키와 모델 설정을 확인해 주세요.');
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: instruction }] }, contents: [{ role: 'user', parts: [{ text: JSON.stringify(payload) }] }], generationConfig: { temperature: 0, maxOutputTokens: 512, thinkingConfig: { thinkingLevel: 'minimal' } } }),
      signal: AbortSignal.timeout(35000), cache: 'no-store'
    });
    if (response.status === 429) throw new GemmaError('Gemma 요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.');
    if (response.status >= 500) throw new GemmaError('Google Gemma 서비스가 일시적으로 응답하지 않습니다. 잠시 후 다시 시도해 주세요.');
    if (!response.ok) throw new GemmaError('Gemma 연결·키·모델 설정을 확인해 주세요.');
    const candidate = (await response.json()).candidates?.[0];
    if (candidate?.finishReason !== 'STOP') throw new GemmaError('Gemma 응답이 완료되지 않았습니다.');
    const text = candidate.content.parts.filter(p => !p.thought).map(p => p.text || '').join('').trim().replace(/^```(?:json)?\s*\n([\s\S]*?)\n?```$/, '$1');
    return JSON.parse(text);
  } catch (error) {
    if (error instanceof GemmaError) throw error;
    throw new GemmaError('Gemma 응답 생성·검증에 실패했습니다. 잠시 후 다시 시도해 주세요.');
  }
}

export async function buildGemmaPlan(body) {
  let profile = validateProfile(body.profile);
  let changes = {};
  if (body.message !== undefined) {
    if (typeof body.message !== 'string' || !body.message.trim() || body.message.length > 1000) throw new Error('변경 요청은 1~1,000자로 입력해 주세요.');
    const current = Object.fromEntries(fields.map(k => [k, profile[k]]));
    const result = await generate('정착 조건 변경을 JSON {"changes":{...}}로 반환한다. 허용 필드: monthly_budget,initial_budget (양수 AUD), max_commute (1~180 정수 분), housing_type(any/share/studio), sort_by(balanced/cheapest/fastest), insurance(0 이상 AUD), workplace(Sydney CBD/Surry Hills/Parramatta). 명시한 변경만 반환한다. 더 저렴하게는 cheapest, 짧은 통근은 fastest. 타 통화를 임의 환산하지 않는다. 무관한 요청은 빈 changes. 다른 필드·설명·URL을 생성하지 않는다.', { message: body.message, profile: current });
    changes = validateChanges(result, profile);
    profile = validateProfile({ ...profile, ...changes });
  }
  const plan = { ...buildPlan(profile), changes };
  try {
    const result = await generate('정착 계획의 강조점을 JSON {"focus":"budget 또는 commute 또는 checklist","source_ids":["제공된 guide id"]}로 선택한다. 숫자·URL·법률 판단은 생성하지 않는다. 통근 null은 미확인이다. 공개 시작 요금은 확정 견적이 아니다.', {
      options: plan.options.map(h => ({ id: h.id, monthly: h.monthly, commute: h.commute, monthly_missing: h.monthly_missing })),
      guides: plan.guides.map(g => ({ id: g.id, title: g.title, text: g.text }))
    });
    if (!object(result) || Object.keys(result).some(k => !['focus', 'source_ids'].includes(k)) || !['budget', 'commute', 'checklist'].includes(result.focus) || !Array.isArray(result.source_ids) || result.source_ids.length > 20 || result.source_ids.some(id => !plan.guides.some(g => g.id === id))) throw new GemmaError('Gemma 설명의 출처 검증에 실패했습니다.');
    plan.mode = 'gemma';
    plan.explanation_source_ids = result.source_ids;
    plan.explanation = `Gemma가 ${{budget:'비용',commute:'통근',checklist:'준비 절차'}[result.focus]} 중심으로 정리했습니다. 공개 시작 요금과 참고 예산을 사용하며 실제 계약 조건·경로는 원문에서 확인하세요.`;
  } catch (error) {
    plan.warnings.push(error instanceof GemmaError ? error.message + ' 규칙 기반 계산 결과를 표시합니다.' : 'Gemma 설명 생성에 실패하여 규칙 기반 결과를 표시합니다.');
  }
  return plan;
}
