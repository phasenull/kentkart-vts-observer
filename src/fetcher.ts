import * as GtfsRealtimeBindings from "gtfs-realtime-bindings"

export default async function fetchVTS(args?:{is_fallback: boolean,auth_token:string,auth_type:"004"}) : Promise<GtfsRealtimeBindings.transit_realtime.FeedMessage> {
	const {auth_token,auth_type,is_fallback} = args || {}
	const region = process.env.KENTKART_REGION || "004"
	console.log(`${new Date().toISOString()} - fetching VTS data for region`, region)
	const url = is_fallback ? process.env.KENTKART_RL1_API_SERVICE_URL : process.env.KENTKART_API_SERVICE_URL
	const response = await fetch(
		`${url}/gtfs/realtime?${new URLSearchParams({
			region: region,
			antiCache: `${Math.random()}`,
		}).toString()}`,
		{
			headers: {
				"Authorization": `Bearer ${auth_token || process.env.KENTKART_API_TOKEN || ""}`,
				"User-Agent": `kentkart-vts-observer`,
				"git-url": "https://github.com/phasenull/kentkart-vts-observer",
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
			json = undefined
		}
		if (json) {
			throw new Error(`VTS Server returned error: ${json.result?.message}`)
		}
		throw new Error("couldn't parse feed")
	}
	return feed


}