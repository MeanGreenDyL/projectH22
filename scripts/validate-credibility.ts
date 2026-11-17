/**
 * pnpm validate:credibility — tier rules, forbidden-terms scan, required counterReading,
 * no-dates-in-scenarios regex, canon checks. Requires the schema gate to pass first.
 */
import { runCredibilityGate } from '../src/validation/credibility';
import { loadDataset } from '../src/validation/load';
import { runSchemaGate } from '../src/validation/schema-gate';
import { hasErrors } from '../src/validation/types';
import { dataDirFromArgs, printIssues } from './report';

const schema = runSchemaGate(loadDataset(dataDirFromArgs(process.argv)));
if (hasErrors(schema.issues)) {
  printIssues('validate (prerequisite)', schema.issues);
  console.error('validate:credibility: schema gate failed; fix `pnpm validate` errors first.');
  process.exitCode = 1;
} else {
  process.exitCode = printIssues('validate:credibility', runCredibilityGate(schema.parsed, { now: new Date() }));
}
