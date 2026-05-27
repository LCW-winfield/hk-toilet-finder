'use client';

import { useState } from 'react';

const initialState = {
  submissionType: 'new',
  targetToiletId: '',
  nameZh: '',
  nameEn: '',
  addressZh: '',
  addressEn: '',
  districtZh: '',
  districtEn: '',
  latitude: '',
  longitude: '',
  openingHours: '',
  accessible: false,
  babyCare: false,
  note: ''
};

export function SubmissionForm() {
  const [form, setForm] = useState(initialState);
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      className="form-grid"
      onSubmit={async (event) => {
        event.preventDefault();
        setSubmitting(true);
        setStatus('');

        const response = await fetch('/api/submissions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...form,
            targetToiletId: form.targetToiletId || null,
            nameEn: form.nameEn || null,
            addressEn: form.addressEn || null,
            districtEn: form.districtEn || null,
            openingHours: form.openingHours || null,
            note: form.note || null,
            latitude: Number(form.latitude),
            longitude: Number(form.longitude)
          })
        });

        if (!response.ok) {
          setStatus('提交失敗，請檢查資料後再試。');
          setSubmitting(false);
          return;
        }

        setForm(initialState);
        setStatus('提交成功，已進入待審核狀態。');
        setSubmitting(false);
      }}
    >
      <label>
        提交類型
        <select value={form.submissionType} onChange={(event) => setForm((current) => ({ ...current, submissionType: event.target.value }))}>
          <option value="new">新公廁</option>
          <option value="correction">資料糾錯</option>
        </select>
      </label>
      <label>
        目標公廁 ID（如為糾錯可填）
        <input type="text" value={form.targetToiletId} onChange={(event) => setForm((current) => ({ ...current, targetToiletId: event.target.value }))} />
      </label>
      <label>
        名稱（中文）
        <input required type="text" value={form.nameZh} onChange={(event) => setForm((current) => ({ ...current, nameZh: event.target.value }))} />
      </label>
      <label>
        名稱（英文）
        <input type="text" value={form.nameEn} onChange={(event) => setForm((current) => ({ ...current, nameEn: event.target.value }))} />
      </label>
      <label>
        地址（中文）
        <input required type="text" value={form.addressZh} onChange={(event) => setForm((current) => ({ ...current, addressZh: event.target.value }))} />
      </label>
      <label>
        地址（英文）
        <input type="text" value={form.addressEn} onChange={(event) => setForm((current) => ({ ...current, addressEn: event.target.value }))} />
      </label>
      <label>
        地區（中文）
        <input required type="text" value={form.districtZh} onChange={(event) => setForm((current) => ({ ...current, districtZh: event.target.value }))} />
      </label>
      <label>
        地區（英文）
        <input type="text" value={form.districtEn} onChange={(event) => setForm((current) => ({ ...current, districtEn: event.target.value }))} />
      </label>
      <label>
        緯度
        <input required type="number" step="any" value={form.latitude} onChange={(event) => setForm((current) => ({ ...current, latitude: event.target.value }))} />
      </label>
      <label>
        經度
        <input required type="number" step="any" value={form.longitude} onChange={(event) => setForm((current) => ({ ...current, longitude: event.target.value }))} />
      </label>
      <label>
        開放時間
        <input type="text" value={form.openingHours} onChange={(event) => setForm((current) => ({ ...current, openingHours: event.target.value }))} />
      </label>
      <label>
        備註
        <textarea value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} />
      </label>
      <label>
        <input type="checkbox" checked={form.accessible} onChange={(event) => setForm((current) => ({ ...current, accessible: event.target.checked }))} /> 無障礙
      </label>
      <label>
        <input type="checkbox" checked={form.babyCare} onChange={(event) => setForm((current) => ({ ...current, babyCare: event.target.checked }))} /> 母嬰友善
      </label>
      <button className="primary-btn" type="submit" disabled={submitting}>
        {submitting ? '提交中...' : '提交資料'}
      </button>
      {status ? <p>{status}</p> : null}
    </form>
  );
}
