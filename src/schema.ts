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
	vehicle_label: text("vehicle_label", { length: 100 }),
}, (table) =>
[	index("vts_custom_created_at_index").on(table.created_at),
	index("vts_custom_vehicle_id_index").on(table.vehicle_id),
	index("vts_custom_route_id_index").on(table.trip_route_id),
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
}, (table) => 
	[
		index("vehicles_id_index").on(table.id),
		index("vehicles_license_plate_index").on(table.license_plate),
	]
)

export const VTS_METADATA = sqliteTable("vts_metadata", {
	created_at: int("created_at", { mode: "timestamp" }).primaryKey().notNull().unique(),
	vehicle_count: int("vehicle_count").notNull(),
})