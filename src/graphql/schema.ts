import { readFileSync } from 'node:fs';

// Read next to this module: `npm run build` copies schema.graphql into dist/graphql.
export const typeDefs = readFileSync(new URL('./schema.graphql', import.meta.url), 'utf8');
