import { NextRequest, NextResponse } from 'next/server';
import { buildPlan, interpretDemo } from '@/lib/demo.mjs';
import { buildGemmaPlan, GemmaError } from '@/lib/gemma.server.mjs';
export const runtime = 'nodejs';
export const maxDuration = 90;

export async function POST(request: NextRequest) {
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ detail: 'JSON 요청을 확인해 주세요.' }, { status: 400 }); }
  if (!body || typeof body !== 'object') return NextResponse.json({ detail: '입력 조건이 필요합니다.' }, { status: 400 });
  const base = process.env.API_BASE_URL?.replace(/\/$/, '');
  if (base) {
    try {
      const response = await fetch(base + (body.message !== undefined ? '/api/plans/revise' : '/api/plans'), {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...(process.env.BACKEND_API_KEY ? { 'X-API-Key': process.env.BACKEND_API_KEY } : {}) },
        body: JSON.stringify(body.message !== undefined ? { profile: body.profile, message: body.message } : body.profile),
        signal: AbortSignal.timeout(90000), cache: 'no-store'
      });
      const result = await response.json();
      return NextResponse.json(result, { status: response.status });
    } catch { return NextResponse.json({ detail: '계획 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 502 }); }
  }
  try {
    if (process.env.GEMINI_API_KEY) return NextResponse.json(await buildGemmaPlan(body));
    const edit = body.message !== undefined ? interpretDemo(body.message, body.profile) : null;
    const plan = buildPlan(edit ? edit.profile : body.profile);
    return NextResponse.json({ ...plan, changes: edit?.changes ?? {} });
  } catch (e) { return NextResponse.json({ detail: e instanceof Error ? e.message : '조건을 확인해 주세요.' }, { status: e instanceof GemmaError ? 503 : 422 }); }
}
