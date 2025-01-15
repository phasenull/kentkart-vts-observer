export interface Vehicle {
	id: number,
	vehicle: {
		trip: {
			tripId: string,
			scheduleRelationship: number,
			routeId: string,
		},
		position: {
			latitude: number,
			longitude: number,
			bearing: number,
			speed: number,
		},
		currentStopSequence: number,
		currentStatus: number,
		timestamp: number,
		stopId: string,
		vehicle: {
			id: string,
			label: string,
			licensePlate: string,
		},
	},
}