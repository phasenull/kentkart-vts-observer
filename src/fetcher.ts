import * as GtfsRealtimeBindings from "gtfs-realtime-bindings"
import db from "./db"
import { VTS } from "./schema"

export default async function fetchVTS() {
	const region = "004"
	// const token = env.KK_PN_JWT
	const response = await fetch(
		`https://service.kentkart.com/api/gtfs/realtime?${new URLSearchParams({
			region: region,
			antiCache: `${Math.random()}`
		}).toString()}`,
		{
			headers: {
				"User-Agent": `ProjectFKart.workers.STO.apps.VTS`,
				"Project": "FKart",
				"Project-Url": "not_available",
			},
		}
	)
	const buffer = await response.arrayBuffer()
	const bfr = Buffer.from(buffer)
	let feed, json
	try {
		feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer))
	} catch {
		feed = undefined
	}
	if (!feed) {
		const bfr_str = bfr.toString()
		try {
			json = JSON.parse(bfr_str)
		} catch (e) {
			// console.warn("Successfully couldn't parse as JSON")
			json = undefined
		}
		if (json) {
			throw new Error(`VTS Server returned error: ${json.result?.message}`)
		}
		throw new Error("couldn't parse feed")
	}
	return feed


}