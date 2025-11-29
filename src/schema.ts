import { sqliteTable, int, real, text, index, primaryKey } from "drizzle-orm/sqlite-core";


export const VTS = sqliteTable("vts", {
	created_at: int("created_at", { mode: "timestamp" }),
	vehicle_license_plate: text("vehicle_license_plate", { length: 10 }),
	vehicle_id: int("vehicle_id"),
	trip_route_direction: int("direction"),
	trip_route_id: int("trip_route_id"),
	trip_trip_id: int("trip_trip_id"),
	trip_schedule_relationship: int("trip_schedule_relationship"),
	position_latitude: real("position_latitude"),
	position_longitude: real("position_longitude"),
	position_bearing: real("position_bearing"),
	position_speed: real("position_speed"),
	current_stop_sequence: int("current_stop_sequence"),
	current_status: int("current_status"),
	timestamp: int("timestamp", { mode: "timestamp" }),
	stop_id: int("stop_id"),
},
	(table) =>
		[
			index("vts_vehicle_id_index").on(table.vehicle_id),
		]
)

export const VEHICLES = sqliteTable("vehicles", {
	id: int("id").primaryKey().unique().notNull(),
	license_plate: text("license_plate", { length: 10 }).unique().notNull(),
	created_at: int("created_at", { mode: "timestamp" }),
	last_seen: int("last_seen", { mode: "timestamp" }),
	bicycle: int("is_bicycle", { mode: "boolean" }),
	accesible: int("is_accesible", { mode: "boolean" }),
	ac: int("is_ac", { mode: "boolean" }),
	agency_id: int("agency_id"),
}, (table) =>
	[
		index("vehicles_id_index").on(table.id),
		index("vehicles_license_plate_index").on(table.license_plate),
	]
)


export const AGENCIES = sqliteTable("agencies", {
	id: int("id").primaryKey().notNull(),
	created_at: int("created_at", { mode: "timestamp" }).notNull(),
	name: text("name", { length: 200 }).notNull(),
	phone: text("phone", { length: 20 }),
	email: text("email", { length: 30 }),
	website: text("website", { length: 30 }),
	color: text("color", { length: 10 }),
	base64image: text("base64image", { length: 1000 }),
	info: text("info", { length: 400 }),
})

export const TRIPS = sqliteTable("trips", {
	trip_id: int("id").primaryKey().notNull(),
	direction: int("direction").default(0),
	// also is the short name for the route (A-B)
	trip_headsign: text("trip_headsign", { length: 200 }),

	// trip details for exceptional cases like different paths for specific hours
	trip_info: text("trip_info", { length: 400 }),


	// full name of the route (A-B-C-D-E)
	route_name: text("route_name", { length: 200 }),
	route_id: int("route_id").notNull(),
	// visible route code (41K, 41Ç)
	display_route_code: text("display_route_code", { length: 10 }),

	agency_id: int("agency_id"),

	updated_at: int("updated_at", { mode: "timestamp" }),
	created_at: int("created_at", { mode: "timestamp" }).notNull(),
	departure_time: text("departure_time", { length: 5 }),
	pattern_color: text("pattern_color", { length: 10 }),
	service_id: int("service_id"),
	is_public: int("is_public", { mode: "boolean" }),
	branched_display_route_code: text("branched_display_route_code", { length: 10 }),
	special_occasion: text("special_occasion", { mode: "json" }).$type<{
		start_at: Date,
		end_at: Date,
		created_at: Date,
		updated_at: Date,
		label: string,
		description?: string
	}>(),
	// 01-ABC-012-01-01234567
	["~internal~use~only~~~gc~object~id"]: text("gc_object_id", { length: 16 })
})

export const VEHICLE_EVENTS = sqliteTable("vehicle_events", {
	created_at: int("created_at", { mode: "timestamp" }).notNull(),
	license_plate: text("license_plate").notNull(),
	vehicle_id: int("id").notNull(),
	trip_id: int("trip_id"),
	route_code: int("route_code"),
	direction: int("direction"),
	event_label: text("event_label").$type<"vehicle_created" | "vehicle_destroyed">().notNull()
}, (table) => [
	index("vehicle_events_vehicle_id_index").on(table.vehicle_id,table.created_at),
	index("vehicle_events_vehicle_id_index").on(table.vehicle_id,table.route_code,table.direction,table.created_at),
	index("vehicle_events_vehicle_id_index").on(table.route_code,table.direction,table.created_at),
	// primaryKey({ columns: [table.created_at, table.vehicle_id, table.trip_id] }),

])

export const VTS_METADATA = sqliteTable("vts_metadata", {
	created_at: int("created_at", { mode: "timestamp" }).primaryKey().notNull().unique(),
	vehicle_count: int("vehicle_count").notNull(),
})