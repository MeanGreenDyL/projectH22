/** pnpm validate — Zod validation across all collections. Non-zero exit on any error. */
import { loadDataset } from '../src/validation/load';
import { runSchemaGate } from '../src/validation/schema-gate';
import { dataDirFromArgs, printIssues } from './report';

const { issues } = runSchemaGate(loadDataset(dataDirFromArgs(process.argv)));
process.exitCode = printIssues('validate', issues);
