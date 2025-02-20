// create express router
import { desc, eq } from "drizzle-orm";
import db from "../db";
import { AGENCIES, TRIPS } from "../schema";
import { Router } from "express";
export const TripsController = Router();
const MAX_LIMIT = 1000
const DEFAULT_LIMIT = 500


TripsController.get("/latest", async (req, res) => {
	const result = await db.select().from(TRIPS).orderBy(desc(TRIPS.created_at)).limit(50);
	res.json({
		success: true,
		data: result,
	});
})
TripsController.get("/count", async (req, res) => {
	const result = await db.$count(TRIPS);
	res.json({
		success: true,
		data: result,
	});
})

TripsController.get("/unique", async (req, res) => {
	try {
		// select unique time keys from the database
		const page = Math.max(parseInt(req.query.page as string), 0) || 0;
		const limit = Math.max(Math.min(MAX_LIMIT, parseInt(req.query.limit as string)), DEFAULT_LIMIT) || DEFAULT_LIMIT;

		// Define the expected type for the result

		// Fetch the distinct created_at values
		const result = await db
			.selectDistinct({
				route_id: TRIPS.route_id, 
				display_route_code: TRIPS.display_route_code,
				route_label: TRIPS.route_name,
				agency_id: TRIPS.agency_id,
				is_public:TRIPS.is_public,

			}
			)
			.from(TRIPS)
			.offset(page * limit)
			.limit(limit).groupBy(TRIPS.route_id);
		res.json({
			success: true,
			count: result.length,
			data: result,
		});
	} catch (error) {
		console.error(error)
		res.status(500).json({ data: [], message: "Internal Server Error" });
	}
})
TripsController.get("/list", async (req, res) => {
	try {
		// select unique time keys from the database
		const page = Math.max(parseInt(req.query.page as string), 0) || 0;
		const limit = Math.max(Math.min(MAX_LIMIT, parseInt(req.query.limit as string)), DEFAULT_LIMIT) || DEFAULT_LIMIT;

		// Define the expected type for the result

		// Fetch the distinct created_at values
		const result = await db
			.select()
			.from(TRIPS)
			.offset(page * limit)
			.limit(limit)
		res.json({
			success: true,
			count: result.length,
			data: result,
		});
	} catch (error) {
		console.error(error)
		res.status(500).json({ data: [], message: "Internal Server Error" });
	}
})
TripsController.get("/:id", async (req, res) => {
	const id = parseInt(req.params.id);
	if (isNaN(id)) {
		res.status(400).json({ message: "Invalid ID" });
		return
	}
	const result = await db.query.TRIPS.findFirst({ where: eq(TRIPS.trip_id, id) });
	res.json({
		success: true,
		data: result || null,
	});
})