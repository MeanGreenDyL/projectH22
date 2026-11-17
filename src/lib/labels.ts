/** Display names. Kept in one place so legends, filters and headings agree. */
import type { Domain } from '../schemas';

export const DOMAIN_LABEL: Record<Domain, string> = {
  cyber: 'Cyber',
  crypto: 'Crypto',
  'us-law': 'US law',
  geopolitical: 'Geopolitical',
  economic: 'Economic',
  infrastructure: 'Infrastructure',
  natural: 'Natural hazards',
};
