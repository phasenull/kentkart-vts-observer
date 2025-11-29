// create express router
import { and, asc, between, desc, eq } from "drizzle-orm";
import db from "../db";
import { AGENCIES, TRIPS, VEHICLE_EVENTS } from "../schema";
import { Router } from "express";
export const EventsController = Router();

const MAX_LIMIT = 1000;
const DEFAULT_LIMIT = 500;

EventsController.get("/latest", async (req, res) => {
	const result = await db
		.select()
		.from(VEHICLE_EVENTS)
		.orderBy(desc(VEHICLE_EVENTS.created_at))
		.limit(500);
	res.json({
		success: true,
		data: result,
	});
});
EventsController.get("/count", async (req, res) => {
	const result = await db.$count(VEHICLE_EVENTS);
	res.json({
		success: true,
		data: result,
	});
});

EventsController.get("/list", async (req, res) => {
	try {
		// select unique time keys from the database
		const page = Math.max(parseInt(req.query.page as string), 0) || 0;
		const limit =
			Math.max(
				Math.min(MAX_LIMIT, parseInt(req.query.limit as string)),
				DEFAULT_LIMIT
			) || DEFAULT_LIMIT;

		// Define the expected type for the result

		// Fetch the distinct created_at values
		const result = await db
			.select()
			.from(VEHICLE_EVENTS)
			.orderBy(asc(VEHICLE_EVENTS.created_at))
			.offset(page * limit)
			.limit(limit);
		res.json({
			success: true,
			count: result.length,
			data: result,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({ data: [], message: "Internal Server Error" });
	}
});
EventsController.get("/get/lastweek", async (req, res) => {
	const DAY_START = new Date().setHours(0, 0, 0, 0) - 7 * 24 * 60 * 60 * 1_000;
	try {
		const route_code = parseInt(req.query.route as string);
		const direction = parseInt(req.query.direction as string);
		if (!route_code || ![0, 1].includes(direction)) {
			res.json({
				success: false,
				data: null,
				message:
					"direction must be either 0 or 1, and route code must be valid",
			});
			return;
		}
		const result = await db
			.select()
			.from(VEHICLE_EVENTS)
			.orderBy(desc(VEHICLE_EVENTS.created_at))
			.where(
				and(
					between(
						VEHICLE_EVENTS.created_at,
						new Date(DAY_START),
						new Date(DAY_START + 24 * 60 * 60 * 1_000)
					),
					and(
						eq(VEHICLE_EVENTS.route_code, route_code),
						eq(VEHICLE_EVENTS.direction, direction)
					)
				)
			)
			.limit(500);
		res.json({
			success: true,
			count: result.length,
			data: result,
		});
	} catch {
		res.json({
			success: false,
			data: null,
			message: "Internal Server Error",
		});
	}
	return;
});
EventsController.get("/search", async (req, res) => {
	try {
		const search_key = req.query.key as "route" | "bus";
		const date = req.query.date as "lastweek" | undefined;
		const value = parseInt(req.query.value as string);
		if (!value) {
			res.status(400).json({
				success: false,
				message: "value is undefined",
			});
			return;
		}
		if (!["route", "bus"].includes(search_key)) {
			res.status(400).json({
				success: false,
				message: "only 'route' and 'bus' keys are allowed for search feature.",
			});
		}
		let prepared;
		if (search_key === "route") {
			prepared = db
				.select()
				.from(VEHICLE_EVENTS)
				.where(eq(VEHICLE_EVENTS.route_code, value))
				.orderBy(desc(VEHICLE_EVENTS.created_at))
				.limit(500)
				.prepare();
		} else if (search_key === "bus") {
			prepared = db
				.select()
				.from(VEHICLE_EVENTS)
				.where(eq(VEHICLE_EVENTS.vehicle_id, value))
				.orderBy(desc(VEHICLE_EVENTS.created_at))
				.limit(500)
				.prepare();
		} else {
			res.json({
				success: false,
				message: "you should not bee seeing this",
			});
			return;
		}
		const result = await prepared?.all();
		res.json({
			success: true,
			count: result.length,
			data: result,
		});
	} catch {
		res.status(500).json({
			success: false,
			data: null,
			message: "Internal Server Error",
		});
	}
});
