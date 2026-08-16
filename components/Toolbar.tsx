"use client";

import { toArabicDigits } from "@/lib/format";

interface Props {
  query: string;
  onQuery: (v: string) => void;
  matchCount: number | null;
  generations: number;
  maxGenerations: number;
  onGenerations: (g: number) => void;
  guides: boolean;
  onGuides: (v: boolean) => void;
  onFit: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  shown: number;
  hidden: number;
  total: number;
}

function Toggle({
  on,
  onChange,
  children,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`chip${on ? " on" : ""}`}
      onClick={() => onChange(!on)}
      aria-pressed={on}
    >
      {children}
    </button>
  );
}

export function Toolbar(p: Props) {
  // One step past the deepest generation means "show everything".
  const levels = Array.from({ length: p.maxGenerations }, (_, i) => i + 2).filter(
    (g) => g <= p.maxGenerations,
  );

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden />
          <div>
            <h1>شجرة عائلة العريفي</h1>
            <p>
              {toArabicDigits(p.shown)} من {toArabicDigits(p.total)} فرد
              {p.hidden > 0 && ` · ${toArabicDigits(p.hidden)} مطوي`}
            </p>
          </div>
        </div>

        <div className="search">
          <input
            value={p.query}
            onChange={(e) => p.onQuery(e.target.value)}
            placeholder="ابحث عن اسم…"
            aria-label="بحث"
          />
          {p.matchCount !== null && (
            <span className="count">{toArabicDigits(p.matchCount)} نتيجة</span>
          )}
        </div>
      </header>

      <div className="controls">
        <div className="levels" role="group" aria-label="عدد الأجيال المعروضة">
          <span className="levels-label">الأجيال</span>
          {levels.map((g) => (
            <button
              key={g}
              type="button"
              className={`lvl${p.generations === g ? " on" : ""}`}
              onClick={() => p.onGenerations(g)}
              aria-pressed={p.generations === g}
            >
              {toArabicDigits(g)}
            </button>
          ))}
          <button
            type="button"
            className={`lvl wide${p.generations > p.maxGenerations ? " on" : ""}`}
            onClick={() => p.onGenerations(p.maxGenerations + 1)}
            aria-pressed={p.generations > p.maxGenerations}
          >
            الكل
          </button>
        </div>

        <div className="zoomgroup">
          <button type="button" onClick={p.onZoomIn} aria-label="تكبير">
            +
          </button>
          <button type="button" onClick={p.onZoomOut} aria-label="تصغير">
            −
          </button>
          <button type="button" onClick={p.onFit} className="fit">
            ملء الشاشة
          </button>
        </div>

        <div className="chips">
          <Toggle on={p.guides} onChange={p.onGuides}>
            خطوط الأجيال
          </Toggle>
        </div>
      </div>

      <div className="legend">
        <span>
          <i className="sw living" /> على قيد الحياة
        </span>
        <span>
          <i className="sw passed" /> متوفّى
        </span>
        <span>
          <i className="sw founder" /> الجدّ المؤسس
        </span>
        <span>
          <i className="sw bud" /> فرع مطوي — اضغط للتوسيع
        </span>
        <span className="hint">اسحب للتحريك · عجلة الفأرة للتكبير</span>
      </div>
    </>
  );
}
