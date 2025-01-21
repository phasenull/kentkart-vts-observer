// crono job to fetch data from GTFS-RT and store it in the database
//
import fetchVTS from "./fetcher"
import { VEHICLES, VTS, VTS_METADATA } from "./schema"
// node-cron
import * as cron from "node-cron"
import { Vehicle } from "./types"
import db from "./db"


import { Worker, isMainThread, parentPort } from "worker_threads"
import { lt } from "drizzle-orm"

const ENV = process.env
export function CRON_JOB() {
	// on every day of week at 00:00, remove old entries
	cron.schedule(process.env.VTS_CLEANUP_TRIGGER || "0 0 * * *", async () => {
		const allowed = new Date(Math.floor((Date.now() - 1000 * 60 * 60 * 24 * 14)))
		const delete_old = await db.delete(VTS).where(lt(VTS.created_at, allowed))
		console.log(`${new Date().toISOString()} - deleted ${delete_old.changes} old entries`)
	}, { timezone: "Europe/Istanbul", name: "delete_old_entries",runOnInit:true }).addListener("error", (error) => {
		console.error(error)
	})
	
	cron.schedule(process.env.VTS_REFETCH_INTERVAL || "*/60 * * * * *", async () => {
		const feed = await fetchVTS()
		if (!feed.header.timestamp) throw new Error(`${new Date().toISOString()} - no timestamp header found`)
		const now = ((feed.header.timestamp as any).low || feed.header.timestamp) * 1000
		/// @ts-ignore
		const values: typeof VTS.$inferInsert[] = feed?.entity?.map((vehicle: Vehicle) => {
			if (!vehicle?.vehicle?.trip?.routeId) return undefined
			if (!vehicle.vehicle?.vehicle?.id) return undefined
			const [route_id, direction] = vehicle.vehicle.trip.routeId.split("|")
			const [vehicle_id] = (vehicle.vehicle?.vehicle?.id.split("|"))

			const returnvalues: typeof VTS.$inferInsert = {
				created_at: new Date(now),
				vehicle_license_plate: vehicle.vehicle?.vehicle?.licensePlate,
				trip_trip_id: parseInt((vehicle.vehicle?.trip?.tripId) || "0"),
				trip_schedule_relationship: vehicle.vehicle?.trip?.scheduleRelationship,
				trip_route_id: parseInt(route_id),
				position_latitude: vehicle.vehicle?.position?.latitude,
				position_longitude: vehicle.vehicle?.position?.longitude,
				position_bearing: vehicle.vehicle?.position?.bearing,
				position_speed: vehicle.vehicle?.position?.speed,
				current_stop_sequence: vehicle.vehicle?.currentStopSequence,
				current_status: vehicle.vehicle?.currentStatus,
				timestamp: new Date((
					typeof vehicle.vehicle?.timestamp === "number"
						? vehicle.vehicle?.timestamp
						: (vehicle.vehicle?.timestamp as any).low
				) * 1000 || 0),
				stop_id: parseInt(vehicle.vehicle?.stopId),
				vehicle_id: parseInt(vehicle_id),
				vehicle_label: vehicle.vehicle?.vehicle?.label,
				trip_route_direction: parseInt(direction),
			}

			return returnvalues as typeof VTS.$inferInsert
		}
		) || []

		console.log(`${new Date(now).toISOString()} - found ${values.length} vehicles`)

		const insert_metadata = await db.insert(VTS_METADATA).values({
			vehicle_count: values.length || 0,
			created_at: new Date(now)
		})
		console.log(`${new Date().toISOString()} - inserted ${insert_metadata.changes} metadata`)
		const vehicles_filered = values.map((vehicle) => {
			if (!vehicle.vehicle_id) return
			if (!vehicle.vehicle_license_plate) return
			return {
				id: vehicle.vehicle_id,
				license_plate: vehicle.vehicle_license_plate,
				created_at: new Date(now),
				last_seen: new Date(now),
				// ac: false,
				// accesible: false,
				// bicycle: false,
			} as typeof VEHICLES.$inferInsert
		}).filter((x) => x !== undefined) as any
		console.log(`${new Date().toISOString()} - filtered vehicles!`)
		const vehicles_result = await db.insert(VEHICLES).values(
			vehicles_filered
		).onConflictDoNothing()


		console.log(`${new Date().toISOString()} - inserted ${vehicles_result.changes} vehicles`)
const update_last_seen = await db.update(VEHICLES).set({
			last_seen: new Date(now)
		}).where(VEHICLES.id.in(vehicles_filered.map((v:any) => v.id)))
console.log(`${new Date().toISOString()} - updated ${update_last_seen.changes} last_seen data`)
		const vts_changes = await db.insert(VTS).values(
			values.filter((x) => x !== undefined) as any
		)
		console.log(`${new Date().toISOString()} - inserted ${vts_changes.changes} vts entries`)

	}, { runOnInit: true, timezone: "Europe/Istanbul" }).addListener("error", (error) => {
		console.error(error)
	})

}