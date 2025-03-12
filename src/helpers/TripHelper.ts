import { transit_realtime } from "gtfs-realtime-bindings"
import db from "../db"
import { VEHICLE_EVENTS } from "../schema"
type SWAP = {
	created_at: Date,
	is_initial: boolean,
	feed: transit_realtime.IFeedEntity[]
}
export default abstract class TripHelper {
	static SWAP: SWAP[] = []
	public static async HandleFeedMessageAsync(feed: transit_realtime.FeedMessage) {
		const date = new Date(((feed.header.timestamp as any).low || feed.header.timestamp) * 1000)
		console.log(date)
		const new_swap: SWAP = {
			created_at: date as any,
			feed: feed.entity.sort((a, b) => (a.vehicle?.vehicle?.licensePlate as any) - (b.vehicle?.vehicle?.licensePlate as any)),
			is_initial: TripHelper.SWAP.length === 0
		}
		this.SWAP.push(new_swap)
		if (new_swap.is_initial) {
			console.log(`${new Date().toISOString()} - initial swap, skipping`)
			return
		}
		const new_vehicles = this.listCreatedVehiclesFromSWAPS()
		const destroyed_vehicles = this.listDestroyedVehiclesFromSWAPS()
		console.log(`found ${new_vehicles.length} new vehicles`)
		console.log(`found ${destroyed_vehicles.length} destroyed vehicles`)
		new_vehicles.forEach((e) => TripHelper.handleNewlyCreatedVehicleFromSWAPS(e))
		destroyed_vehicles.forEach((e)=>TripHelper.handleDestroyedVehicleFromSWAPS(e))
		this.SWAP.shift()
	}
	private static listCreatedVehiclesFromSWAPS() {
		if (this.SWAP.length < 2) return []
		const new_swap = this.SWAP[1]
		const NEW_VEHICLES: transit_realtime.IFeedEntity[] = []
		new_swap.feed.forEach((e) => {
			// check if it exists in the old swap
			const found_vehicle = TripHelper.getEntityFromVehicleLicensePlate("old", e.vehicle?.vehicle?.licensePlate as string)
			if (!found_vehicle) {
				NEW_VEHICLES.push(e)
			} else if (found_vehicle?.vehicle?.trip?.tripId!==TripHelper.getEntityFromVehicleLicensePlate("new", e.vehicle?.vehicle?.licensePlate as string)?.vehicle?.trip?.tripId)
			{
				NEW_VEHICLES.push(e)
			}
		})
		return NEW_VEHICLES
	}
	private static listDestroyedVehiclesFromSWAPS() {
		if (this.SWAP.length < 2) return []
		const new_swap = this.SWAP[1]
		const old_swap = this.SWAP[0]
		const DESTROYED_VEHICLES: transit_realtime.IFeedEntity[] = []
		old_swap.feed.forEach((e) => {
			// check if it exists in the old swap
			const found_vehicle = TripHelper.getEntityFromVehicleLicensePlate("new", e.vehicle?.vehicle?.licensePlate as string)
			if (!found_vehicle) {
				DESTROYED_VEHICLES.push(e)
			} else if (found_vehicle?.vehicle?.trip?.tripId!==TripHelper.getEntityFromVehicleLicensePlate("old", e.vehicle?.vehicle?.licensePlate as string)?.vehicle?.trip?.tripId)
			{
				DESTROYED_VEHICLES.push(e)
			}
		})
		return DESTROYED_VEHICLES
	}
	private static async handleNewlyCreatedVehicleFromSWAPS(new_vehicle: transit_realtime.IFeedEntity) {
		const [route,direction] = TripHelper.parseRouteData(new_vehicle.vehicle?.trip?.routeId as any)
		console.log(`${new Date().toISOString()} - CREATED -`, `${new_vehicle.vehicle?.vehicle?.licensePlate} | ${direction} | ${route}`)
		const created_at = this.SWAP[0].created_at
		const current_date = this.SWAP[1].created_at
		const [vehicle_id] = this.parseVehicleId(new_vehicle.vehicle?.vehicle?.id as string)
		await db.insert(VEHICLE_EVENTS).values({
			created_at:created_at,
			license_plate:new_vehicle.vehicle?.vehicle?.licensePlate as string,
			vehicle_id:vehicle_id,
			direction:direction,
			event_label:"vehicle_created",
			route_code:route,
			trip_id:parseInt(new_vehicle.vehicle?.trip?.tripId || "0")
		})
	}
	private static async handleDestroyedVehicleFromSWAPS(destroyed_vehicle: transit_realtime.IFeedEntity) {
		const [route,direction] = TripHelper.parseRouteData(destroyed_vehicle.vehicle?.trip?.routeId as any)
		console.log(`${new Date().toISOString()} - DESTROYED -`, `${destroyed_vehicle.vehicle?.vehicle?.licensePlate} | ${direction} | ${route}`)
		const created_at = this.SWAP[0].created_at
		const current_date = this.SWAP[1].created_at
		const [vehicle_id] = this.parseVehicleId(destroyed_vehicle.vehicle?.vehicle?.id as string)
		await db.insert(VEHICLE_EVENTS).values({
			created_at:created_at,
			license_plate:destroyed_vehicle.vehicle?.vehicle?.licensePlate as string,
			vehicle_id:vehicle_id,
			direction:direction,
			event_label:"vehicle_destroyed",
			route_code:route,
			trip_id:parseInt(destroyed_vehicle.vehicle?.trip?.tripId || "0")
		})
	}
	private static parseRouteData(route_data:string ) {
		const [route_code,direction,_] = route_data.split("|")
		return [parseInt(route_code),parseInt(direction)]
	}
	private static parseVehicleId(id:string) {
		const [v_id,_] = id.split("|")
		return [parseInt(v_id)]
	}
	private static getEntityFromVehicleLicensePlate(swap: "new" | "old", licensePlate: string) {
		return this.SWAP[swap === "old" ? 0 : (this.SWAP.length - 1)].feed.find((e) => e.vehicle?.vehicle?.licensePlate === licensePlate)
	}
}