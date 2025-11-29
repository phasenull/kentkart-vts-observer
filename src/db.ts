import {Database} from "bun:sqlite"
import { drizzle } from "drizzle-orm/bun-sqlite"
import * as schema from './schema'
const sqlite = new Database('VTS.db');
const db = drizzle(sqlite,{schema:schema});
export default db