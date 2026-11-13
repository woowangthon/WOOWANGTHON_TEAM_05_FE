import data from '@/data/sydney.json';
export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json({ status: 'ok', data_version: data.version,
    ai_configured: Boolean(process.env.API_BASE_URL || process.env.GEMINI_API_KEY),
    connection: process.env.API_BASE_URL ? 'backend' : process.env.GEMINI_API_KEY ? 'google' : 'rules',
    readiness: 'configuration_only' });
}
