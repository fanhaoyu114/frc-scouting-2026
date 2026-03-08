import { createClient, Client } from '@libsql/client';

let dbInstance: Client | null = null;

function getDbClient(): Client {
  if (dbInstance) return dbInstance;

  const databaseUrl = process.env.DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN;

  console.log('[DB] Initializing database connection...');

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  if (databaseUrl.startsWith('libsql://') || databaseUrl.startsWith('https://')) {
    if (!authToken) {
      throw new Error('DATABASE_AUTH_TOKEN is required for Turso connection');
    }
    console.log('[DB] Connecting to Turso...');
    dbInstance = createClient({
      url: databaseUrl,
      authToken: authToken,
    });
  } else {
    console.log('[DB] Using local SQLite...');
    dbInstance = createClient({ url: databaseUrl });
  }

  console.log('[DB] Connected successfully');
  return dbInstance;
}

export const getDb = (): Client => {
  if (!dbInstance) return getDbClient();
  return dbInstance;
};

// Export db for backward compatibility - uses Proxy to lazily initialize
export const db: Client = new Proxy({} as Client, {
  get(target, prop) {
    const client = getDb();
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
});

export function generateId(): string {
  return 'cl' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function generateToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36) + Math.random().toString(36).substring(2);
}
