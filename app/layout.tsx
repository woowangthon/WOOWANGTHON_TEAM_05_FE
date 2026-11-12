import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: '온보딩 · 낯선 도시, 나다운 시작', description: '주거·통근·예산·준비 절차를 한 번에 비교하는 해외 정착 도우미. 우왕톤 05팀 우짤래.' };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="ko"><body>{children}</body></html>; }
