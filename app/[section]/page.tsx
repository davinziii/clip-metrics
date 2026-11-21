import Workspace from '@/components/workspace';
import { notFound } from 'next/navigation';
export function generateStaticParams() { return ['videos', 'compare', 'niches', 'settings'].map(section => ({ section })); }
export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!['videos', 'compare', 'niches', 'settings'].includes(section)) notFound();
  return <Workspace page={section as 'videos' | 'compare' | 'niches' | 'settings'} />;
}
