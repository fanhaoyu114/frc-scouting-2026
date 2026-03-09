import type { Client } from '@libsql/client/web';

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
  name TEXT
);

CREATE TABLE IF NOT EXISTS Match (
  id TEXT PRIMARY KEY,
  matchNumber INTEGER NOT NULL,
  matchType TEXT DEFAULT 'QUALIFICATION',
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
  teamId TEXT,
  userId TEXT,
  alliance TEXT NOT NULL,
  scoutName TEXT,
  robotType TEXT,
  autoLeftStartLine INTEGER DEFAULT 0,
  autoFuelShots INTEGER DEFAULT 0,
  autoFuelAccuracy REAL DEFAULT 50,
  autoClimbLevel INTEGER DEFAULT 0,
  autoWon INTEGER DEFAULT 0,
  teleopTransitionShots INTEGER DEFAULT 0,
  teleopTransitionAccuracy REAL DEFAULT 50,
  teleopTransitionDefense INTEGER DEFAULT 0,
  teleopTransitionTransport INTEGER DEFAULT 0,
  teleopShift1Shots INTEGER DEFAULT 0,
  teleopShift1Accuracy REAL DEFAULT 50,
  teleopShift1Defense INTEGER DEFAULT 0,
  teleopShift1Transport INTEGER DEFAULT 0,
  teleopShift2Shots INTEGER DEFAULT 0,
  teleopShift2Accuracy REAL DEFAULT 50,
  teleopShift2Defense INTEGER DEFAULT 0,
  teleopShift2Transport INTEGER DEFAULT 0,
  teleopShift3Shots INTEGER DEFAULT 0,
  teleopShift3Accuracy REAL DEFAULT 50,
  teleopShift3Defense INTEGER DEFAULT 0,
  teleopShift3Transport INTEGER DEFAULT 0,
  teleopShift4Shots INTEGER DEFAULT 0,
  teleopShift4Accuracy REAL DEFAULT 50,
  teleopShift4Defense INTEGER DEFAULT 0,
  teleopShift4Transport INTEGER DEFAULT 0,
  teleopEndgameShots INTEGER DEFAULT 0,
  teleopEndgameAccuracy REAL DEFAULT 50,
  teleopClimbLevel INTEGER DEFAULT 0,
  teleopClimbTime INTEGER DEFAULT 0,
  minorFouls INTEGER DEFAULT 0,
  majorFouls INTEGER DEFAULT 0,
  yellowCard INTEGER DEFAULT 0,
  redCard INTEGER DEFAULT 0,
  foulRecords TEXT,
  foulNotes TEXT,
  driverRating REAL DEFAULT 5.0,
  defenseRating REAL DEFAULT 5.0,
  wasDisabled INTEGER DEFAULT 0,
  disabledDuration TEXT,
  notes TEXT,
  autoScore INTEGER DEFAULT 0,
  teleopScore INTEGER DEFAULT 0,
  totalScore INTEGER DEFAULT 0,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (matchId) REFERENCES Match(id),
  FOREIGN KEY (teamId) REFERENCES Team(id),
  FOREIGN KEY (userId) REFERENCES User(id)
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
    tablesInitialized = true;
  }
}

async function getDbClient(): Promise<Client> {
  if (dbInstance) return dbInstance;

  const databaseUrl = process.env.DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN;

  console.log('[DB] Initializing database connection...');

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  // Turso 远程数据库 (libsql:// 或 https://)
  if (databaseUrl.startsWith('libsql://') || databaseUrl.startsWith('https://')) {
    if (!authToken) {
      throw new Error('DATABASE_AUTH_TOKEN is required for Turso connection');
    }
    console.log('[DB] Connecting to Turso...');
    const { createClient } = await import('@libsql/client/web');
    dbInstance = createClient({
      url: databaseUrl,
      authToken: authToken,
    });
  } else if (databaseUrl.startsWith('file:')) {
    // 本地 SQLite 文件 - 使用标准 libsql 客户端
    console.log('[DB] Connecting to local SQLite file...');
    const { createClient } = await import('@libsql/client');
    dbInstance = createClient({ url: databaseUrl });
  } else if (databaseUrl.startsWith('http://')) {
    // HTTP 连接
    console.log('[DB] Connecting via HTTP...');
    const { createClient } = await import('@libsql/client/web');
    dbInstance = createClient({
      url: databaseUrl,
      authToken: authToken,
    });
  } else {
    // 假设是本地路径，添加 file: 前缀
    console.log('[DB] Connecting to local SQLite (assuming file path)...');
    const { createClient } = await import('@libsql/client');
    dbInstance = createClient({ url: 'file:' + databaseUrl });
  }

  console.log('[DB] Connected successfully');
  return dbInstance;
}

export const getDb = async (): Promise<Client> => {
  const db = await getDbClient();
  await initializeTables(db);
  return db;
};

export function generateId(): string {
  return 'cl' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function generateToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36) + Math.random().toString(36).substring(2);
}
