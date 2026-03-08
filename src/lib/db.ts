import { createClient, Client } from '@libsql/client';

let dbInstance: Client | null = null;
let tablesInitialized = false;

const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS User (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT,
  isAdmin INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS Session (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expiresAt TEXT NOT NULL,
  FOREIGN KEY (userId) REFERENCES User(id)
);

CREATE TABLE IF NOT EXISTS Team (
  id TEXT PRIMARY KEY,
  number INTEGER UNIQUE NOT NULL,
  name TEXT,
  autoLeave INTEGER DEFAULT 0,
  autoCoralLeft INTEGER DEFAULT 0,
  autoCoralRight INTEGER DEFAULT 0,
  autoAlgae INTEGER DEFAULT 0,
  teleopCoralLeft INTEGER DEFAULT 0,
  teleopCoralRight INTEGER DEFAULT 0,
  teleopAlgae INTEGER DEFAULT 0,
  barge INTEGER DEFAULT 0,
  processor INTEGER DEFAULT 0,
  climb INTEGER DEFAULT 0,
  defense INTEGER DEFAULT 0,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS Match (
  id TEXT PRIMARY KEY,
  matchNumber INTEGER NOT NULL,
  blue1 INTEGER,
  blue2 INTEGER,
  blue3 INTEGER,
  red1 INTEGER,
  red2 INTEGER,
  red3 INTEGER,
  blueScore INTEGER DEFAULT 0,
  redScore INTEGER DEFAULT 0,
  winner TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ScoutingRecord (
  id TEXT PRIMARY KEY,
  matchId TEXT,
  teamNumber INTEGER NOT NULL,
  teamId TEXT,
  alliance TEXT NOT NULL,
  station INTEGER DEFAULT 1,
  autoLeave INTEGER DEFAULT 0,
  autoCoralLeft INTEGER DEFAULT 0,
  autoCoralRight INTEGER DEFAULT 0,
  autoAlgae INTEGER DEFAULT 0,
  teleopCoralLeft INTEGER DEFAULT 0,
  teleopCoralRight INTEGER DEFAULT 0,
  teleopAlgae INTEGER DEFAULT 0,
  barge INTEGER DEFAULT 0,
  processor INTEGER DEFAULT 0,
  climb TEXT DEFAULT 'none',
  defense INTEGER DEFAULT 0,
  notes TEXT,
  scoutName TEXT,
  scoutTeam INTEGER,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (matchId) REFERENCES Match(id),
  FOREIGN KEY (teamId) REFERENCES Team(id)
);
`;

async function initializeTables(db: Client): Promise<void> {
  if (tablesInitialized) return;

  try {
    console.log('[DB] Initializing tables...');
    const statements = CREATE_TABLES_SQL.trim().split(';').filter(s => s.trim());
    for (const sql of statements) {
      if (sql.trim()) {
        await db.execute(sql);
      }
    }
    tablesInitialized = true;
    console.log('[DB] Tables initialized successfully');
  } catch (error) {
    console.error('[DB] Error initializing tables:', error);
    throw error;
  }
}

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

export const getDb = async (): Promise<Client> => {
  const db = getDbClient();
  await initializeTables(db);
  return db;
};

export function generateId(): string {
  return 'cl' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function generateToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36) + Math.random().toString(36).substring(2);
}
// Build v1772979386
