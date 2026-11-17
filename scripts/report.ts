import type { Issue } from '../src/validation/types';

export function printIssues(gate: string, issues: readonly Issue[]): number {
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  for (const i of [...errors, ...warnings]) {
    const where = [i.file, i.recordId && `(${i.recordId})`].filter(Boolean).join(' ');
    const line = `${i.severity.toUpperCase()} ${i.rule}${where ? ` ${where}` : ''}: ${i.message}`;
    (i.severity === 'error' ? console.error : console.warn)(line);
  }
  console.log(`${gate}: ${errors.length} error(s), ${warnings.length} warning(s)`);
  return errors.length > 0 ? 1 : 0;
}

/** `--data <dir>` overrides the data directory (used by tests and fixtures). */
export function dataDirFromArgs(argv: readonly string[]): string | undefined {
  const i = argv.indexOf('--data');
  return i >= 0 ? argv[i + 1] : undefined;
}
