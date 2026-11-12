'use client';

import { useState, type ReactNode } from 'react';
import { buildPlan, defaults } from '@/lib/demo.mjs';

type Profile = typeof defaults;
type Plan = ReturnType<typeof buildPlan> & { changes?: Record<string, unknown> };
const money = (value: number) => new Intl.NumberFormat('en-AU', { maximumFractionDigits: 0 }).format(value);
const purposes: Record<string, string> = { working_holiday: '워킹홀리데이', employment: '취업', internship: '인턴' };
const changeLabels: Record<string, string> = { sort_by: '추천 순서', max_commute: '최대 통근시간', monthly_budget: '월 예산', initial_budget: '초기 예산', housing_type: '주거 형태', insurance: '보험료', workplace: '근무 지역' };
function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    home: <><path d="m3 10 9-7 9 7v10H3Z" /><path d="M9 20v-7h6v7" /></>,
    pin: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    link: <><path d="M14 3h7v7m0-7-11 11" /><path d="M10 3H4v17h17v-6" /></>,
    spark: <><path d="m12 2 2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6Z" /></>,
    wallet: <><rect x="3" y="5" width="18" height="15" rx="3" /><path d="M3 8V4l14-2v3m4 7h-6v5h6" /></>,
    list: <><path d="M9 6h12M9 12h12M9 18h12m-18-12h1m-1 6h1m-1 6h1" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18" /></>
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.spark}</svg>;
}
function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) { return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>; }
function HouseArt({ color }: { color: string }) { return <div className={'house-art ' + color} aria-hidden="true"><span className="sun" /><div className="building back"><i /><i /><i /><i /></div><div className="building front"><div className="roof" /><i /><i /><i /><i /><b /></div><div className="tree"><span /><b /></div><div className="ground" /></div>; }

export default function Home() {
  const [profile, setProfile] = useState<Profile>({ ...defaults });
  const [plan, setPlan] = useState<Plan>(() => buildPlan(defaults));
  const [selectedId, setSelectedId] = useState(plan.options[0]?.id ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [notice, setNotice] = useState('기본 조건으로 만든 예시 계획입니다. 왼쪽에서 내 조건을 입력해 주세요.');
  const selected = plan.options.find(h => h.id === selectedId) ?? plan.options[0];
  const completeCount = plan.guides.filter(g => done[g.id]).length;
  const update = (key: keyof Profile, value: string | number | null) => setProfile(p => ({ ...p, [key]: value }));
  async function generate(target: Profile, revision?: string) {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profile: target, ...(revision !== undefined ? { message: revision } : {}) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(typeof result.detail === 'string' ? result.detail : '입력 조건을 확인해 주세요.');
      setPlan(result); setProfile(result.profile); setSelectedId(result.options[0]?.id ?? '');
      const changes = Object.keys(result.changes ?? {}).map(k => changeLabels[k] ?? k);
      setNotice(revision ? (changes.length ? changes.join(' · ') + ' 조건을 반영했습니다.' : '요청을 확인했습니다. 조건 변경이 필요하면 구체적으로 입력해 주세요.') : '입력한 조건으로 정착 계획을 계산했습니다.');
      if (revision !== undefined) setMessage('');
    } catch (e) { setError(e instanceof Error ? e.message : '계획을 생성하지 못했습니다.'); }
    finally { setLoading(false); }
  }
  return <>
    <header className="site-header"><a className="brand" href="#top"><span className="brand-mark"><Icon name="globe" size={23} /></span>온보딩<span className="brand-en">onboarding</span></a><nav aria-label="주 메뉴"><a href="#compare">주거·통근</a><a href="#checklist">준비 체크리스트</a><a href="#sources">공식 정보</a></nav><span className="team-tag">우짤래 · TEAM 05</span></header>
    <main id="top">
      <section className="hero"><div><div className="eyebrow"><span /> YOUR NEXT CHAPTER, SIMPLIFIED</div><h1>낯선 도시에서도,<br /><em>나답게 시작하세요.</em></h1><p>어디서 일할지, 얼마를 쓸 수 있을지.<br className="mobile-break" /> 흩어진 준비를 하나의 정착 계획으로.</p></div><div className="destination"><div className="destination-label"><Icon name="pin" size={15} /> 첫 번째 목적지</div><strong>Sydney<span>호주, 시드니</span></strong><svg viewBox="0 0 250 100" aria-hidden="true"><path d="M5 82h240M12 70h30V43h14v27h18V28h18v42h20V55h14v15M148 81l12-41 17 41m-8-1 20-61 21 61m-10 1 18-35 21 35" /><path d="M5 90q25-8 50 0t50 0t50 0t50 0t40 0" /></svg><small>한 도시부터, 차근차근</small></div></section>
      <div className="workspace">
        <aside className="profile-panel"><div className="panel-title"><span className="step">01</span><div><h2>나의 출발 조건</h2><p>나에게 맞는 시작을 찾아볼까요?</p></div></div>
          <form onSubmit={e => { e.preventDefault(); void generate(profile); }}><fieldset disabled={loading}>
            <div className="form-section"><h3><Icon name="globe" size={15} /> 체류 계획</h3><div className="form-row"><Field label="국적"><input value={profile.nationality} maxLength={80} required onChange={e => update('nationality', e.target.value)} /></Field><Field label="도시"><select value={profile.city} onChange={e => update('city', e.target.value)}><option value="Sydney">호주 · 시드니</option></select></Field></div>
              <Field label="체류 목적"><select value={profile.purpose} onChange={e => update('purpose', e.target.value)}><option value="working_holiday">워킹홀리데이</option><option value="employment">취업</option><option value="internship">인턴</option></select></Field>
              <div className="form-row"><Field label="비자 상태"><select value={profile.visa_status} onChange={e => update('visa_status', e.target.value)}><option value="undecided">미정</option><option value="preparing">준비 중</option><option value="held">보유</option></select></Field><Field label="입국 예정일"><input type="date" required value={profile.arrival_date} onChange={e => update('arrival_date', e.target.value)} /></Field></div>
            </div>
            <div className="form-section"><h3><Icon name="pin" size={15} /> 근무 위치</h3><Field label="회사명 · 선택" hint="회사명으로 주소를 자동 추정하지 않아요."><input placeholder="회사나 카페 이름" maxLength={120} value={profile.company} onChange={e => update('company', e.target.value)} /></Field><Field label="확인한 근무 지역" hint="MVP는 아래 3개 지역의 가상 통근 자료를 지원해요."><select value={profile.workplace} onChange={e => update('workplace', e.target.value)}><option>Sydney CBD</option><option>Surry Hills</option><option>Parramatta</option></select></Field></div>
            <div className="form-section"><h3><Icon name="wallet" size={15} /> 예산과 생활</h3><div className="form-row"><Field label="월 예산 · AUD"><input type="number" step="any" min="1" max="100000" required value={profile.monthly_budget} onChange={e => update('monthly_budget', Number(e.target.value))} /></Field><Field label="초기 예산 · AUD"><input type="number" step="any" min="1" max="1000000" required value={profile.initial_budget} onChange={e => update('initial_budget', Number(e.target.value))} /></Field></div><div className="form-row"><Field label="주거 형태"><select value={profile.housing_type} onChange={e => update('housing_type', e.target.value)}><option value="any">상관없어요</option><option value="share">쉐어룸</option><option value="studio">스튜디오</option></select></Field><Field label="최대 통근 · 분"><input type="number" min="1" max="180" required value={profile.max_commute} onChange={e => update('max_commute', Number(e.target.value))} /></Field></div><Field label="월 의료·보험료 · AUD, 선택" hint="아직 모르면 비워 두세요. 미확인 비용으로 표시해요."><input type="number" step="any" min="0" max="10000" placeholder="견적 확인 후 입력" value={profile.insurance ?? ''} onChange={e => update('insurance', e.target.value === '' ? null : Number(e.target.value))} /></Field></div>
            <button className="primary generate" type="submit">{loading ? '계획을 만들고 있어요…' : '내 정착 계획 만들기'}<Icon name="arrow" size={18} /></button><p className="privacy-note">로그인 없이, 현재 화면에서 시작해요.</p>
          </fieldset></form>
        </aside>
        <div className="results" aria-busy={loading}>
          <div className="results-heading"><div><div className="eyebrow">MY SETTLEMENT PLAN</div><h2>시드니에서의 첫 페이지</h2><p>{purposes[plan.profile.purpose]} <span>·</span> {plan.profile.workplace} <span>·</span> 최대 통근 {plan.profile.max_commute}분</p></div><span className={'mode ' + (plan.mode === 'gemma' ? 'live' : '')}><span />{plan.mode === 'gemma' ? 'Gemma 연결' : '데모 · Gemma 미연결'}</span></div>
          <div className="status-note" role="status"><Icon name="spark" size={17} /><span>{notice}</span></div>
          <p className="plan-explanation">{plan.explanation}</p>
          {error && <div className="error" role="alert">{error}</div>}
          <section className="budget-section" aria-label="선택 후보 예산 요약">
            <div className="budget-card main-budget"><div className="card-label"><Icon name="wallet" size={17} /> 월 예상 지출 {selected?.monthly_missing.length ? '· 부분 합계' : ''}</div><div className="big-number">{selected ? money(selected.monthly) : '—'}<span>AUD / 월</span></div><div className="budget-meter"><i style={{ width: selected ? Math.min(100, selected.monthly / plan.profile.monthly_budget * 100) + '%' : '0%' }} /></div><p>{selected ? '알려진 비용 기준 예산 잔액 ' + money(selected.monthly_remaining) + ' AUD' : '후보를 찾으면 지출을 계산해요.'}</p><small>{!selected ? '선택된 후보가 없습니다.' : selected.monthly_missing.length ? '추정치 · 의료·보험료 미포함' : '추정치 · 입력한 보험료 포함'}</small></div>
            <div className="budget-card"><div className="card-label">초기 정착 비용 · 부분 합계</div><div className="big-number">{selected ? money(selected.initial) : '—'}<span>AUD</span></div><p>보증금 + 선납 월세 + 이사비</p><small>{selected ? '미확인: ' + selected.initial_missing.join(', ') : '가상 후보 기준으로 계산합니다.'}</small></div>
            <div className="budget-card progress-card"><div className="card-label">나의 준비 현황</div><div className="big-number">{completeCount}<span>/ {plan.guides.length}개 완료</span></div><div className="check-dots">{plan.guides.map(g => <span key={g.id} className={done[g.id] ? 'filled' : ''}><Icon name="check" size={12} /></span>)}</div><p>하나씩 체크하며 준비해요.</p></div>
          </section>
          <section id="compare" className="section-block"><div className="section-heading"><div><h3><Icon name="home" /> 주거와 출근길, 함께 비교해요 <span className="count">{plan.options.length}</span></h3><p>모든 후보와 비용은 시연용 가상 데이터입니다. 실제 매물이 아닙니다.</p></div><label className="sort-label">정렬<select disabled={loading} value={plan.profile.sort_by} onChange={e => { void generate({ ...plan.profile, sort_by: e.target.value }); }}><option value="balanced">비용·통근 균형</option><option value="cheapest">월 지출 낮은 순</option><option value="fastest">통근 짧은 순</option></select></label></div>
            {plan.options.length ? <div className="housing-grid">{plan.options.map((h, idx) => <article key={h.id} className={'housing-card ' + (selected?.id === h.id ? 'selected' : '')}><div className="art-wrap"><HouseArt color={h.color} /><span className="demo-tag">DEMO · 가상 매물</span><span className="rank">0{idx + 1}</span></div><div className="housing-body"><div className="area"><Icon name="pin" size={13} />{h.area}<span>{h.type === 'share' ? '쉐어룸' : '스튜디오'}</span></div><h4>{h.name}</h4><div className="rent">{money(h.rent)} <span>AUD / 월</span></div><small className="weekly">주 {money(h.weekly_rent)} AUD · 52주/12개월 환산</small><div className="house-tags">{h.tags.map(tag => <span key={tag}>{tag}</span>)}</div><dl><div><dt><Icon name="clock" size={14} /> 편도 통근 · 추정</dt><dd>{h.commute}분</dd></div><div><dt>월 교통비 · 추정</dt><dd>{money(h.monthly_transport)} AUD</dd></div><div><dt>월 지출 {h.monthly_missing.length ? '부분 합계' : '합계'} · 추정</dt><dd>{money(h.monthly)} AUD</dd></div></dl><button disabled={loading} className="select-house" aria-pressed={selected?.id === h.id} onClick={() => setSelectedId(h.id)}>{selected?.id === h.id ? <><Icon name="check" size={15} /> 비교 기준으로 선택됨</> : '이 후보로 예산 확인'}</button></div></article>)}</div> : <div className="empty"><Icon name="home" size={36} /><h4>지금 조건에 맞는 후보가 없어요.</h4><p>월·초기 예산을 늘리거나 통근시간·주거 형태 조건을 조정해 보세요.</p><button className="secondary" disabled={loading} onClick={() => { void generate({ ...defaults }); }}>기본 예시 조건으로 다시 보기</button></div>}
            {selected && <div className="cost-breakdown"><strong>{selected.area} 기준 월 지출</strong><div><span>월세 {money(selected.rent)}</span><span>교통 {money(selected.monthly_transport)}</span><span>식비 {money(plan.living_costs.food)}</span><span>공과금 {money(plan.living_costs.utilities)}</span><span>통신 {money(plan.living_costs.phone)}</span><span>보험 {plan.profile.insurance === null ? '미확인' : money(plan.profile.insurance)}</span><b>단위 AUD · 추정</b></div></div>}
          </section>
          <section className="revise-panel"><div className="revise-icon"><Icon name="spark" size={23} /></div><div className="revise-content"><h3>계획을 조금 바꿔볼까요?</h3><p>{plan.mode === 'gemma' ? '변경할 조건을 말하면 Gemma가 해석하고 다시 계산해요.' : '데모는 아래 예시 명령을 지원해요. 자유로운 대화는 Gemma 연결 후 가능해요.'}</p><form onSubmit={e => { e.preventDefault(); void generate(plan.profile, message); }}><label className="sr-only" htmlFor="revision">조건 변경 요청</label><input id="revision" value={message} onChange={e => setMessage(e.target.value)} maxLength={1000} required disabled={loading} placeholder="예: 더 저렴하게, 통근 60분으로 바꿔줘" /><button type="submit" className="primary" disabled={loading || !message.trim()} aria-label="변경 요청 적용"><Icon name="arrow" size={20} /></button></form><div className="prompt-chips">{['더 저렴하게', '통근 60분', '쉐어룸으로', '월 예산 2500'].map(s => <button key={s} disabled={loading} onClick={() => { void generate(plan.profile, s); }}>{s} <span>↗</span></button>)}</div></div></section>
          <section id="checklist" className="section-block"><div className="section-heading"><div><h3><Icon name="list" /> 준비는 한 번에 하나씩</h3><p>체류 목적·비자 상태에 맞춘 공식 안내를 확인하세요.</p></div><span className="subtle">{completeCount} / {plan.guides.length} 완료</span></div><div className="checklist-grid">{['출국 전', '입국 직후', '취업·입주 전'].map((stage, idx) => <div className="checklist-column" key={stage}><div className="stage-heading"><span>0{idx + 1}</span><h4>{stage}</h4></div>{plan.guides.filter(g => g.stage === stage).map(g => <div key={g.id} className={'checklist-item ' + (done[g.id] ? 'done' : '')}><label><input type="checkbox" checked={!!done[g.id]} onChange={e => setDone(d => ({ ...d, [g.id]: e.target.checked }))} /><span>{g.title}</span></label><p>{g.text}</p><a href={g.url} target="_blank" rel="noreferrer">{g.publisher}<Icon name="link" size={12} /></a></div>)}</div>)}</div></section>
          <section id="sources" className="sources"><div><span className="source-icon"><Icon name="check" size={19} /></span><h3>결정의 근거도 함께 담았어요.</h3><p>공식 안내는 원문과 확인일을 표시합니다. 구체적인 자격·계약 조건은 공식 기관에 확인하세요.</p></div><details><summary>출처 {plan.guides.length}개 · 확인일 2026.11.12</summary><ul>{plan.guides.map(g => <li key={g.id}><a href={g.url} target="_blank" rel="noreferrer">{g.title} ↗</a><span>{g.publisher} · {g.checked_at}</span></li>)}</ul></details></section>
          <details className="data-note"><summary>데이터와 계산 기준 알아보기</summary>{plan.warnings.map(w => <p key={w}>{w}</p>)}<p>데이터 버전: {plan.data_version}. 자유 주소·실시간 매물·실시간 길찾기는 아직 지원하지 않습니다. 체크 상태는 현재 화면에서만 유지됩니다.</p></details>
        </div>
      </div>
    </main><footer><a className="brand" href="#top"><span className="brand-mark"><Icon name="globe" size={18} /></span>온보딩</a><p>새로운 일상으로 가는, 가장 다정한 첫걸음.</p><span>2026 AI 우왕톤 · 우짤래</span></footer>
  </>;
}
