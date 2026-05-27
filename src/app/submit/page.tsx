import { SubmissionForm } from '@/components/submission-form';

export default function SubmitPage() {
  return (
    <main className="map-pane">
      <section className="panel">
        <h1>提交新公廁或糾錯</h1>
        <p>如果你發現新的公廁，或現有資料有誤，可以提交給我們審核。</p>
        <SubmissionForm />
      </section>
    </main>
  );
}
