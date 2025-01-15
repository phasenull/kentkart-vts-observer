// create express router
import db from "../db";


import { Router } from "express";
import { VTS, VTS_METADATA } from "../schema";
import { desc, eq } from "drizzle-orm";
export const VTSController = Router();
const MAX_LIMIT = 500
const DEFAULT_LIMIT = 100
/**
 * @swagger
 * components:
 *  schemas:
 *    VTS Entry Metadata:
 *      type: object
 *      properties:
 *        created_at:
 *          type: integer
 *          description: The time key for the VTS data
 *        vehicle_count:
 *          type: integer
 *          description: The number of vehicles observed at the time key
 */

/**
 * @swagger
 * /api/vts/list:
 *  get:
 *    tags:
 *      - VTS
 *    summary: Get a list of VTS time keys
 *    parameters:
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
 *        description: A list of VTS time keys
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                success:
 *                  type: boolean
 *                  description: The success status of the response
 *                count:
 *                  type: integer
 *                  description: The number of unique time keys
 *                data:
 *                  type: array
 *                  items:
 *                    $ref: '#/components/schemas/VTS'
 */
VTSController.get("/list", async (req, res) => {
	try {
		// select unique time keys from the database
		const page = Math.max(parseInt(req.query.page as string)) || 0;
		const limit = Math.max(Math.min(MAX_LIMIT, parseInt(req.query.limit as string)), DEFAULT_LIMIT) || DEFAULT_LIMIT;

		// Define the expected type for the result

		// Fetch the distinct created_at values
		const result = await db
			.selectDistinct()
			.from(VTS_METADATA)
			.offset(page * limit)
			.limit(limit);

		res.json({
			success: true,
			count: result.length,
			data: result,
		});
	} catch (error) {
		res.status(500).json({ data: [], message: "Internal Server Error" });
	}
})
