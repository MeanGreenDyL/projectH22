/**
 * Supply calculator island (spec §9). Every number it shows comes from a cited guidance record
 * via calculate(); an item with no cited figure says "not available". Printable (browser print)
 * and exportable (plain-text download that works offline once saved).
 */
import { useId, useMemo, useState } from 'react';
import type { Guidance, Source } from '../../schemas';
import { LIMITS, calculate } from '../../lib/supply-calc';

interface Props {
  records: Guidance[];
  sources: Record<string, Pick<Source, 'id' | 'title' | 'publisher' | 'url'>>;
  wanted: { key: string; title: string }[];
}

export default function SupplyCalculator({ records, sources, wanted }: Props) {
  const id = useId();
  const [people, setPeople] = useState(2);
  const [days, setDays] = useState(3);
  const [hotClimate, setHot] = useState(false);
  const lines = useMemo(() => calculate(records, { people, days, hotClimate }, wanted), [records, people, days, hotClimate, wanted]);
  const hasHotRecords = records.some((r) => r.quantity?.condition === 'hot-climate');

  const exportText = () => {
    const body = [
      `Household supplies: ${people} ${people === 1 ? 'person' : 'people'}, ${days} ${days === 1 ? 'day' : 'days'}${hotClimate ? ', hot climate' : ''}`,
      '',
      ...lines.map((l) => (l.amount === undefined ? `[ ] ${l.title}: not available yet` : `[ ] ${l.title}: ${l.amount} ${l.unit} (${l.working}; source: ${sources[l.sourceId ?? '']?.title ?? l.sourceId})`)),
      '',
      'In an emergency call 911. For local help and services call or text 211.',
    ].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([body], { type: 'text/plain' }));
    a.download = 'household-supplies.txt';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="rounded-md border border-rule p-4">
      <form className="flex flex-wrap items-end gap-4 no-print" onSubmit={(e) => e.preventDefault()}>
        <label className="text-sm" htmlFor={`${id}-people`}>
          <span className="block text-ink-secondary">People in the household</span>
          <input id={`${id}-people`} type="number" inputMode="numeric" min={LIMITS.people[0]} max={LIMITS.people[1]} value={people}
            onChange={(e) => setPeople(Math.min(LIMITS.people[1], Math.max(LIMITS.people[0], Number(e.target.value) || 1)))}
            className="mt-1 h-10 w-24 rounded-sm border border-border bg-surface px-2 text-ink" />
        </label>
        <label className="text-sm" htmlFor={`${id}-days`}>
          <span className="block text-ink-secondary">Days to cover</span>
          <input id={`${id}-days`} type="number" inputMode="numeric" min={LIMITS.days[0]} max={LIMITS.days[1]} value={days}
            onChange={(e) => setDays(Math.min(LIMITS.days[1], Math.max(LIMITS.days[0], Number(e.target.value) || 1)))}
            className="mt-1 h-10 w-24 rounded-sm border border-border bg-surface px-2 text-ink" />
        </label>
        <label className="flex min-h-10 items-center gap-2 text-sm text-ink-secondary">
          <input type="checkbox" checked={hotClimate} onChange={(e) => setHot(e.target.checked)} className="h-5 w-5" disabled={!hasHotRecords} />
          Hot climate{!hasHotRecords && ' (no cited adjustment yet)'}
        </label>
        <button type="button" onClick={() => window.print()} className="h-10 rounded-sm border border-border px-3 text-sm text-ink hover:border-accent">Print</button>
        <button type="button" onClick={exportText} className="h-10 rounded-sm border border-border px-3 text-sm text-ink hover:border-accent">Download as text</button>
      </form>
      <table className="mt-4 w-full text-sm" aria-live="polite">
        <caption className="text-left text-xs text-ink-muted">Quantities for {people} {people === 1 ? 'person' : 'people'} over {days} {days === 1 ? 'day' : 'days'}. Each figure links to the guidance it comes from.</caption>
        <thead><tr className="border-b border-rule text-left text-ink-secondary"><th className="py-1 font-semibold">Item</th><th className="py-1 font-semibold">Amount</th><th className="py-1 font-semibold">How it is worked out</th></tr></thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.key} className="border-b border-rule align-top">
              <td className="py-2 text-ink">{l.title}</td>
              <td className="num py-2 text-ink">{l.amount === undefined ? <span className="text-ink-muted">not available</span> : <strong>{l.amount} {l.unit}</strong>}</td>
              <td className="py-2 text-ink-secondary">
                {l.amount === undefined ? 'No cited figure yet. None is estimated.' : <>{l.working}. <a className="text-accent underline" href={sources[l.sourceId ?? '']?.url}>{sources[l.sourceId ?? '']?.title ?? l.sourceId}</a></>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
