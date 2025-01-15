import * as GtfsRealtimeBindings from "gtfs-realtime-bindings"

export default async function fetchVTS() {
	const region = process.env.KENTKART_REGION || "004"
	console.log(`${new Date().toISOString()} - fetching VTS data for region`, region)
	const response = await fetch(
		`https://service.kentkart.com/api/gtfs/realtime?${new URLSearchParams({
			region: region,
			antiCache: `${Math.random()}`
		}).toString()}`,
		{
			headers: {
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