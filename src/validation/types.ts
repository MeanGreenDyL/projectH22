import type { ScripturalCorrelation, Scenario, Series, Source, VerifiedEvent } from '../schemas';

export type Severity = 'error' | 'warning';

export interface Issue {
  /** Stable rule code, e.g. COR-CERTAINTY-TERMS. Listed in docs/AGENT-REFRESH.md. */
  rule: string;
  severity: Severity;
  message: string;
  file?: string;
  recordId?: string;
}

/** A file as read from disk, before schema validation. */
export interface RawFile {
  file: string;
  data: unknown;
  /** Set when the file could not be read or parsed as JSON / YAML. */
  readError?: string;
}

export interface RawDataset {
  sources: RawFile | undefined;
  events: RawFile[];
  correlations: RawFile[];
  scenarios: RawFile[];
  series: RawFile[];
}

export interface Located<T> {
  file: string;
  record: T;
}

/** Records that passed the schema gate. The credibility gate only ever sees these. */
export interface ParsedDataset {
  sources: Located<Source>[];
  events: Located<VerifiedEvent>[];
  correlations: Located<ScripturalCorrelation>[];
  scenarios: Located<Scenario>[];
  series: Located<Series>[];
}

export interface GateContext {
  /** Injected so tests are deterministic. */
  now: Date;
}

export function hasErrors(issues: readonly Issue[]): boolean {
  return issues.some((i) => i.severity === 'error');
}
