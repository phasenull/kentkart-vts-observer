// drizzle.config.ts
import { defineConfig } from "drizzle-kit"
export default defineConfig({
	dialect: "sqlite",
	schema: "./src/schema.ts",
	out: "./drizzle",
	dbCredentials:{
		url: process.env.DATABASE_URL || "VTS.db"
	}
})
