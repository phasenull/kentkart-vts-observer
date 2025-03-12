// crono job to fetch data from GTFS-RT and store it in the database
//
import fetchVTS from "./fetcher"
import { AGENCIES, TRIPS, VEHICLES, VTS, VTS_METADATA } from "./schema"
// node-cron
import * as cron from "node-cron"
import { Vehicle } from "./types"
import db from "./db"


import { Worker, isMainThread, parentPort } from "worker_threads"
import { lt, inArray, eq, isNull } from "drizzle-orm"
import TripHelper from "./helpers/TripHelper"
import { getDatabaseSize } from "./server"
const ENV = process.env
export function CRON_JOB() {
	cron.schedule(process.env.VTS_CLEANUP_TRIGGER || "0 0 1 * *", async () => {
		const initial_size = getDatabaseSize()
		const allowed = new Date(Math.floor((Date.now() - 1000 * 60 * 60 * 24 * 30)))
		const delete_old = await db.delete(VTS).where(lt(VTS.created_at, allowed))
		await db.run("VACUUM;")
		const new_size = getDatabaseSize()
		console.log(`${new Date().toISOString()} - deleted ${delete_old.changes} old entries DB SIZE CHANGE : ${new_size-initial_size}`)
	}, { timezone: "Europe/Istanbul", name: "delete_old_entries", runOnInit: false }).addListener("error", (error) => {
		console.error(error)
	})
	function formatNumber(num: number = 0, commas: number = 1) {
		return Math.floor(num * (10 ** commas)) / (10 ** commas)

	}
	cron.schedule("0 0 * * *", async () => {
		console.log("Running trip generator")
		// select nont proccessed trips
		const non_proccessed = await db.select().from(TRIPS).where(isNull(TRIPS.is_public))
		const route_list: {
			agencyId: string
			agencyName: string
			displayRouteCode: string
			name: string
			routeCode: string
			type: string
		}[] = (await (await fetch(
			(process.env.KENTKART_RL1_API_SERVICE_URL || "https://service.kentkart.com/rl1/api")
			+ "/route/list"
			+ "?" + new URLSearchParams({
				region: process.env.KENTKART_REGION || "004",
			})
		)).json())?.routeList?.filter((x: any) => x.type === "route")
		// @ts-ignore

		const agencies_result = await db.insert(AGENCIES).values(
			route_list.map((route) => {
				return {
					id: parseInt(route.agencyId),
					created_at: new Date(),
					name: route.agencyName
				}
			})

		).onConflictDoNothing()
		console.log("Inserted", agencies_result.changes, "AGENCIES")


		function routeInfoFromRouteCode(code: number) {
			return route_list.find((x) => parseInt(x.routeCode) === code)
		}
		interface Path {
			busList: []
			busStopList: []
			direction: "0" | "1"
			direction_name: ""
			displayRouteCode: string
			headSign: string
			path_code: number
			pointList: []
			scheduleList:
			[{
				description: "MTWTFss", serviceId: "1", timeList: {

					departureTime: string
					patternColor: string
					tripHeadSign: string
					tripId: string
				}[]
			}, {
				description: "mtwtfSs", serviceId: "2", timeList: {

					departureTime: string
					patternColor: string
					tripHeadSign: string
					tripId: string
				}[]
			}
				, {
					description: "mtwtfsS", serviceId: "3", timeList: {

						departureTime: string
						patternColor: string
						tripHeadSign: string
						tripId: string
					}[]
				}]
			,
			stopTimeList: never[]
			timeTableList: never[],
			tripShortName: string
		}
		const CACHED_ROUTES = new Map<string, {
			pathList: [Path, Path?]
			,
			all_trips: Record<string, any>
		}>()
		function cacheRoute(key: string, paths: Path[]) {
			if (!paths || !paths.length) {
				console.warn("no paths found for key", key)
				return
			}
			CACHED_ROUTES.set(key, {
				pathList: paths as any,
				all_trips: paths.reduce((acc, path) => {
					path.scheduleList.forEach((schedule) => {
						schedule.timeList.forEach((time) => {
							/// @ts-ignore
							acc[time.tripId] = {
								departureTime: time.departureTime,
								patternColor: time.patternColor,
								tripHeadSign: time.tripHeadSign,
								tripId: time.tripId,
								serviceId: schedule.serviceId
							}
						})
					})
					return acc
				}, {})
			})
			return CACHED_ROUTES.get(key)
		}
		let i = 0
		for (const trip of non_proccessed) {
			i += 1
			console.log(`[${i}/${non_proccessed.length}] Processing trip`, trip.route_id, trip.trip_id)
			const route_info = routeInfoFromRouteCode(trip.route_id)
			if (!route_info) {
				await db.update(TRIPS).set({
					is_public: false
				}).where(eq(TRIPS.route_id, trip.route_id))
				console.log("Route not found for", trip.route_id)
				continue
			}

			const SERVICE = process.env.KENTKART_WEB_SERVICE_URL || `https://service.kentkart.com/rl1/web/pathInfo?${new URLSearchParams(
				{
					region: process.env.KENTKART_REGION || "004",
					resultType: "111111",
					displayRouteCode: route_info.displayRouteCode,
				}
			).toString()}`


			let cached = CACHED_ROUTES.get(route_info.displayRouteCode)
			if (!cached) {
				console.log("fetching route info", route_info.displayRouteCode)
				const request = await fetch(SERVICE)
				const paths = (await request.json() as any).pathList as Path[]
				cached = cacheRoute(route_info.displayRouteCode, paths)
			}
			const trip_details = cached?.all_trips[trip.trip_id]
			// console.log("found trip details!", trip.route_id, trip.trip_id, trip_details)
			await db.update(TRIPS).set({
				is_public: true,
				agency_id: parseInt(route_info.agencyId),
				display_route_code: route_info.displayRouteCode,
				route_name: route_info.name,
				updated_at: new Date(),
				pattern_color: trip_details?.patternColor === "" ? null : trip_details?.patternColor,
				service_id: parseInt(trip_details?.serviceId),
				trip_info: trip_details?.tripHeadSign === "" ? null : trip_details?.tripHeadSign,
				departure_time: trip_details?.departureTime.slice(0, 5),
			}).where(eq(TRIPS.trip_id, trip.trip_id))
		}
	}, {
		name: "trip_generator",
		runOnInit: true,
		timezone: "Europe/Istanbul"
	})
	cron.schedule(process.env.DEV ? "*/15 * * * * *" : (process.env.VTS_REFETCH_INTERVAL || "*/60 * * * * *"), async () => {
		const feed = await fetchVTS()
		if (!feed.header.timestamp) throw new Error(`${new Date().toISOString()} - no timestamp header found`)
		const now = ((feed.header.timestamp as any).low || feed.header.timestamp) * 1000
		console.log(`${new Date().toISOString()} - found header.timestamp: ${new Date(now).toISOString()}`)
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
				position_latitude: formatNumber(vehicle.vehicle?.position?.latitude, 6),
				position_longitude: formatNumber(vehicle.vehicle?.position?.longitude, 6),
				position_bearing: formatNumber(vehicle.vehicle?.position?.bearing, 1),
				position_speed: formatNumber(vehicle.vehicle?.position?.speed, 2),
				current_stop_sequence: vehicle.vehicle?.currentStopSequence,
				current_status: vehicle.vehicle?.currentStatus,
				timestamp: new Date((
					typeof vehicle.vehicle?.timestamp === "number"
						? vehicle.vehicle?.timestamp
						: (vehicle.vehicle?.timestamp as any).low
				) * 1000 || 0),
				stop_id: parseInt(vehicle.vehicle?.stopId),
				vehicle_id: parseInt(vehicle_id),
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
		console.log(`${new Date().toISOString()} - inserted ${vehicles_result.changes} VEHICLES`)
		try {
			const add_trips_result = await db.insert(TRIPS).values(
				values.map((vehicle) => {
					if (!vehicle.trip_trip_id) return
					if (!vehicle.trip_route_id) return
					return {
						created_at: new Date(now),
						direction: vehicle.trip_route_direction,
						route_id: vehicle.trip_route_id,

						// later to be fetched by cron job
						route_name: feed.entity.find((x) => x.vehicle?.vehicle?.licensePlate === vehicle.vehicle_license_plate)?.vehicle?.vehicle?.label,
						trip_headsign: feed.entity.find((x) => x.vehicle?.vehicle?.licensePlate === vehicle.vehicle_license_plate)?.vehicle?.vehicle?.label,
						trip_id: vehicle.trip_trip_id,
					} as typeof TRIPS.$inferInsert
				}).filter((x) => x !== undefined)
			).onConflictDoNothing()
			console.log(`${new Date().toISOString()} - inserted ${add_trips_result.changes} TRIPS`)
		} catch (e) {
			console.error("[CRONJOB] Error while adding trips", e)
		}

		const update_last_seen = await db.update(VEHICLES).set({
			last_seen: new Date(now)
		}).where(inArray(VEHICLES.id, vehicles_filered.map((v: any) => v.id)))
		console.log(`${new Date().toISOString()} - updated ${update_last_seen.changes} last_seen data`)
		try {
			const vts_changes = await db.insert(VTS).values(
				values.filter((x) => x !== undefined) as any
			)
			console.log(`${new Date().toISOString()} - inserted ${vts_changes.changes} vts entries`)
		} catch (error) {
			console.log(`${new Date().toISOString()} - error inserting vts entries:`)
			console.error(error)
		}
		console.log(`${new Date().toISOString()} - Requesting TripHelper`)
		TripHelper.HandleFeedMessageAsync(feed)
	}, { runOnInit: true, timezone: "Europe/Istanbul" }).addListener("error", (error) => {
		console.error(error)
	})

}