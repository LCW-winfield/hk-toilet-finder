import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getToiletById } from '@/lib/toilets';

type ToiletTag = {
  id: string;
  tagKey: string;
};

export default async function ToiletDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const toilet = await getToiletById(id);

  if (!toilet) {
    notFound();
  }

  return (
    <main className="map-pane">
      <section className="panel">
        <Link href="/">← 返回首頁</Link>
        <h1>{toilet.nameZh}</h1>
        <p>{toilet.addressZh}</p>
        <div className="meta-row">
          <span className="meta-pill">{toilet.districtZh}</span>
          <span className="score-pill">整潔 {toilet.cleanlinessScore.toFixed(1)}</span>
          <span className="meta-pill">{toilet.openingHours ?? '未提供開放時間'}</span>
        </div>
        <div className="tag-row">
          {toilet.accessible ? <span className="tag">無障礙入口</span> : null}
          {toilet.babyCare ? <span className="tag">母嬰友善</span> : null}
          {toilet.tags.map((tag: ToiletTag) => (
            <span className="tag" key={tag.id}>
              {tag.tagKey}
            </span>
          ))}
        </div>
        <p>座標：{toilet.latitude}, {toilet.longitude}</p>
      </section>
    </main>
  );
}
