import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

export function createDatabase(url: string, options: { max?: number } = {}) {
  const client = postgres(url, {
    max: options.max ?? 10,
    connect_timeout: 5,
    onnotice: () => undefined,
  });
  const db = drizzle(client, { schema });

  return {
    db,
    ping: async () => {
      await client`select 1`;
    },
    close: async () => {
      await client.end({ timeout: 5 });
    },
  };
}

export type Database = ReturnType<typeof createDatabase>;
