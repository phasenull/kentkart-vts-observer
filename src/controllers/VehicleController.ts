// create express router
import { desc, eq } from "drizzle-orm";
import { Router } from "express";
import db from "../db";
import { AGENCIES, VEHICLES, VTS } from "../schema";
export const VehicleController = Router();
const MAX_LIMIT = 500
const DEFAULT_LIMIT = 100
// vehicle component
// pager component

/**
 * @swagger
 * components:
 *  schemas:
 *    Vehicle:
 *      type: object
 *      properties:
 *        id:
 *          type: integer
 *          description: The unique identifier of the vehicle, given by KentKart
 *        license_plate:
 *          type: string
 *          description: The license plate of the vehicle
 *        created_at:
 *          type: integer
 *          description: The first date the vehicle was observed
 *        last_seen:
 *          type: integer
 *          description: The last date the vehicle was observed
 *        bicycle:
 *          type: integer
 *          description: Whether the vehicle has bicycle support
 *        accesible:
 *          type: integer
 *          description: Whether the vehicle is accesible
 *        ac:
 *          type: integer
 *          description: Whether the vehicle has air conditioning
 */


/**
 * @swagger
 * /api/vehicles/list:
 *  get:
 *    tags:
 *      - Vehicles
 *    summary: Get a list of vehicles
 *    parameters:
 *    - name: page
 *      in: query
 *      description: Page number
 *      required: false
 *      schema:
 *        type: integer
 *    - name: limit
 *      in: query
 *      description: Page size
 *      required: false
 *      schema:
 *        type: integer
 *    responses:
 *      200:
 *        description: Success
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                success:
 *                  type: boolean
 *                count:
 *                  type: integer
 *                data:
 *                  type: array
 *                  items:
 *                    $ref: "#/components/schemas/Vehicle"
 */
VehicleController.get("/list", async (req, res) => {
	try {
		// select unique time keys from the database
		const page = Math.max(parseInt(req.query.page as string), 0) || 0;
		const limit = Math.max(Math.min(MAX_LIMIT, parseInt(req.query.limit as string)), DEFAULT_LIMIT) || DEFAULT_LIMIT;

		// Define the expected type for the result

		// Fetch the distinct created_at values
		const result = await db
			.selectDistinct()
			.from(VEHICLES)
			.offset(page * limit)
			.limit(limit);
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


/**
 * @swagger
 * /api/vehicles/bylicenseplate/{license_plate}:
 *  get:
 *    tags:
 *      - Vehicles
 *    summary: Get a vehicle by its license plate
 *    parameters:
 *      - name: license_plate
 *        in: path
 *        description: The license plate of the vehicle
 *        required: true
 *        type: string
 *    responses:
 *      200:
 *       description: Success
 *       content:
 *        application/json:
 *         schema:
 *          type: object
 *          properties:
 *           success:
 *            type: boolean
 *           data:
 *            $ref: "#/components/schemas/Vehicle"
*/
VehicleController.get("/bylicenseplate/:license_plate", async (req, res) => {
	const license_plate = req.params.license_plate;
	if (!license_plate) {
		res.status(400).json({ message: "Invalid License Plate" });
		return
	}
	const result = await db.query.VEHICLES.findFirst({ where: eq(VEHICLES.license_plate, license_plate) });
	res.json({
		success: true,
		data: result || null,
	});
})
/**
 * @swagger
 * /api/vehicles/count:
 *  get:
 *    tags:
 *      - Vehicles
 *    summary: Get the count of vehicles
 *    responses:
 *      200:
 *       description: Success
 *       content:
 *        application/json:
 *         schema:
 *          type: object
 *          properties:
 *           success:
 *            type: boolean
 *           data:
 *            type: integer
*/
VehicleController.get("/count", async (req, res) => {
	const result = await db.$count(VEHICLES);
	res.json({
		success: true,
		data: result,
	});
})

/**
 * @swagger
 * /api/vehicles/latest:
 *  get:
 *    tags:
 *      - Vehicles
 *    summary: Get the latest added vehicles
 *    responses:
 *      200:
 *       description: Success
 *       content:
 *        application/json:
 *         schema:
 *          type: object
 *          properties:
 *           success:
 *            type: boolean
 *           data:
 *            type: array
 *            items:
 *              $ref: "#/components/schemas/Vehicle"
*/
VehicleController.get("/latest", async (req, res) => {
	const result = await db.select().from(VEHICLES).orderBy(desc(VEHICLES.created_at)).limit(50);
	res.json({
		success: true,
		data: result,
	});
})

/**
 * @swagger
 * /api/vehicles/{id}:
 *  get:
 *    tags:
 *      - Vehicles
 *    summary: Get a vehicle by its ID
 *    parameters:
 *      - name: id
 *        in: path
 *        description: The ID of the vehicle
 *        required: true
 *        type: integer
 *    responses:
 *      200:
 *       description: Success
 *       content:
 *        application/json:
 *         schema:
 *          type: object
 *          properties:
 *           success:
 *            type: boolean
 *           data:
 *            $ref: "#/components/schemas/Vehicle"
*/
VehicleController.get("/:id", async (req, res) => {
	const id = parseInt(req.params.id);
	if (isNaN(id)) {
		res.status(400).json({ message: "Invalid ID" });
		return
	}
	const result = await db.select(
	).from(VEHICLES).where(eq(VEHICLES.id, id)).limit(1).leftJoin(
		AGENCIES, eq(VEHICLES.agency_id, AGENCIES.id)
	);
	res.json({
		success: true,
		data: result || null,
	});
})


/**
 * @swagger
 * /api/vehicles/{id}/history:
 *  get:
 *    tags:
 *      - Vehicles
 *    summary: Get the history of a vehicle
 *    parameters:
 *      - name: id
 *        in: path
 *        description: The ID of the vehicle
 *        required: true
 *        type: integer
 *      - name: page
 *        in: query
 *        description: Page number
 *        required: false
 *        schema:
 *          type: integer
 *      - name: limit
 *        in: query
 *        description: Page size
 *        required: false
 *        schema:
 *          type: integer
 *    responses:
 *      200:
 *       description: Success
 *       content:
 *        application/json:
 *         schema:
 *          type: object
 *          properties:
 *           success:
 *            type: boolean
 *           count:
 *            type: integer
 *           data:
 *            type: array
 *            items:
 *              type: object
 *              properties:
 *                created_at:
 *                  type: integer
 *                vehicle:
 *                  type: object
 *                  properties:
 *                    license_plate:
 *                      type: string
 *                    id:
 *                      type: integer
 *                    timestamp:
 *                      type: integer
 *                trip:
 *                  type: object
 *                  properties:
 *                    id:
 *                      type: integer
 *                route:
 *                  type: object
 *                  properties:
 *                    id:
 *                      type: integer
 *                    direction:
 *                      type: integer
 *                    label:
 *                      type: string
 *                position:
 *                  type: object
 *                  properties:
 *                    latitude:
 *                      type: number
 *                    longitude:
 *                      type: number
 *                    bearing:
 *                      type: number
 *                    speed:
 *                      type: number
 *                stop:
 *                  type: object
 *                  properties:
 *                    id:
 *                      type: integer
 *                    sequence:
 *                      type: integer
 *                current_status:
 *                  type: integer
*/
VehicleController.get("/:id/history", async (req, res) => {
	const id = parseInt(req.params.id);
	const unique = req.query.unique
	let limit: number
	try {
		limit = parseInt(req.query.limit as any)
	} catch (error) {
		limit = DEFAULT_LIMIT
	}
	limit = Math.max(0,Math.Min(limit,MAX_LIMIT))
	const page = Math.max(parseInt(req.query.page as string), 0) || 0;
	if (isNaN(id)) {
		res.status(400).json({
			error: "Invalid ID", success: false
		});
		return
	}
	const prepared = db.select({
		created_at: VTS.created_at,
		vehicle: {
			license_plate: VTS.vehicle_license_plate,
			id: VTS.vehicle_id,
			timestamp: VTS.timestamp,
		},
		route: {
			id: VTS.trip_route_id,
			direction: VTS.trip_route_direction,
			// name: VTS,
		},
		position: {
			latitude: VTS.position_latitude,
			longitude: VTS.position_longitude,
			bearing: VTS.position_bearing,
			speed: VTS.position_speed,
		},
		stop: {
			id: VTS.stop_id,
			sequence: VTS.current_stop_sequence,
		},
		current_status: VTS.current_status,
	}).from(VTS)
		.where(eq(VTS.vehicle_id, id))
		.orderBy(desc(VTS.created_at))
		.limit(limit).offset(page * limit);
	switch (unique) {
		case "route": {
			prepared.groupBy(VTS.trip_route_id);
			break
		} case "trip": {
			prepared.groupBy(VTS.trip_trip_id);
			break
		}
	}
	const result = await prepared.all();
	res.json({
		success: true,
		count: result.length,
		data: result,
	});
})
