import * as GtfsRealtimeBindings from "gtfs-realtime-bindings"
import { FALLBACK_STATE, GLOBAL_EVENTS, triggerFallbackMode } from "."
import { KentKartHelper } from "./helpers/KentKartHelper"

export default async function fetchVTS() : Promise<GtfsRealtimeBindings.transit_realtime.FeedMessage> {
	
	const {is_fallback, auth_token, auth_type,created_at} = FALLBACK_STATE || {}
	const region = process.env.KENTKART_REGION || "004"
	const url = is_fallback ? (process.env.KENTKART_RL1_API_SERVICE_URL||"https://service.kentkart.com/rl1/api") : (process.env.KENTKART_API_SERVICE_URL || "https://service.kentkart.com/api")
	console.log(`${new Date().toISOString()} - fetching VTS data for region`, region)
	console.log("Using URL:", url)
	const response = await fetch(
		`${url}/gtfs/realtime?${new URLSearchParams({
			region: region,
			antiCache: `${Math.random()}`,
			authType: auth_type || "4",
		}).toString()}`,
		{
			headers: {
				"Authorization": `Bearer ${auth_token || KentKartHelper.access_token || ""}`,
				"User-Agent": `kentkart-vts-observer`,
				"git-url": "https://github.com/phasenull/kentkart-vts-observer",
			},
		}
	)
	console.log(`${new Date().toISOString()} - received response:`, response.status, response.statusText)
	const buffer = await response.arrayBuffer()
	const bfr = Buffer.from(buffer)
	let feed, json
	try {
		feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer))
	} catch {
		console.warn(`failed to decode feed (${bfr.length}): ${bfr.toString()}`)
		triggerFallbackMode()
		feed = undefined
	}
	if (!feed) {
		const bfr_str = bfr.toString()
		try {
			json = JSON.parse(bfr_str)
		} catch (e) {
			json = undefined
		}
		if (json) {
			triggerFallbackMode()
			throw new Error(`VTS Server returned error: ${json.result?.message}`)
		}
		triggerFallbackMode()
		throw new Error("couldn't parse feed")
	}
	if (feed.entity.length === 0) {
		triggerFallbackMode()
		throw new Error("empty feed received")
	}
	return feed


}