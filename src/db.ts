import Database from 'better-sqlite3';
import * as schema from './schema'
import { drizzle } from 'drizzle-orm/better-sqlite3';
const sqlite = new Database('VTS.db');
const db = drizzle(sqlite,{schema:schema});
export default db