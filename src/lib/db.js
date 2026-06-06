import { createClient } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import { initDb } from './db-init.js';

const dbPath = path.join(process.cwd(), 'data', 'prode.db');

// Asegurar que la carpeta 'data' existe si se usa localmente
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const url = process.env.TURSO_DATABASE_URL || `file:${dbPath}`;
const authToken = process.env.TURSO_AUTH_TOKEN;

let db;
if (process.env.NODE_ENV === 'production') {
  db = createClient({ url, authToken });
} else {
  // Evitar conexiones duplicadas en desarrollo al recargar el código (hot reload)
  if (!global._sqliteDb) {
    global._sqliteDb = createClient({ url, authToken });
  }
  db = global._sqliteDb;
}

// Ejecutar inicialización de tablas y datos semilla de forma asíncrona
await initDb(db);

export default db;


