import { EventsController } from "./controllers/EventsController";
import { TripsController } from "./controllers/TripsController";
import { VTSController } from "./controllers/VTSController";
import { VehicleController } from "./controllers/VehicleController";
import SwaggerController from "./swagger";
import { Router } from "express";
const fs = require("fs")
const RUNTIME_STARTED_AT = new Date()
export const SERVER = Router()
const path = require("path");
export function getDatabaseSize() {
	const stats = fs.statSync("VTS.db")
	const fileSizeInBytes = stats.size
	return fileSizeInBytes
}
SERVER.use("/docs",SwaggerController)
SERVER.use("/api/vts", VTSController);
SERVER.use("/api/vehicles", VehicleController);
SERVER.use("/api/trips", TripsController);
SERVER.use("/api/events",EventsController)
SERVER.get("/download", async (req, res) => {
	const filePath = path.resolve("VTS.db");
	const utcDate = new Date().toISOString();
	const downloadFileName = `VTS-${utcDate}.db`;
	try {
		res.download(filePath, downloadFileName, (err) => {
			if (err) {
				console.error("Error downloading the file:", err);
				res.status(500).send("Error downloading the file.");
			}
		});

	} catch (err){
		console.error("Error downloading the file:", err);
		res.status(500).send("Error downloading the file.");
	}
});

SERVER.get("/", async (req, res) => {
	res.json({
		status: "OK",
		project: {
			name:"unofficial KentKart VTS Archive API",
			description: "Data might not be 100% accurate",
			version: "0.1.0",
			docs: "/docs",
			dashboard: "/dash",
			git:{
				url:"https://github.com/phasenull/kentkart-vts-observer"
			},
		},
		runtime: {
			started_at: RUNTIME_STARTED_AT,
			uptime_ms: new Date().getTime() - RUNTIME_STARTED_AT.getTime()
		},
		database: {
			file: "VTS.db",
			size: getDatabaseSize(),
			size_human: `${(getDatabaseSize() / 1024 / 1024).toFixed(2)} MB`
		}
	});
})

// github copilot slop
SERVER.get("/dash", async (req, res) => {
    try {
        // Helper to fetch and parse JSON
        const fetchJSON = async (url: string) => {
            const resp = await fetch(url);
            if (!resp.ok) throw new Error(`Failed to fetch ${url}`);
            return resp.json();
        };

        // Parallel requests
        const [
            vehicleCount,
            tripCount,
            eventCount,
            dbSizeResp,
            latestBusesResp
        ] = await Promise.all([
            fetchJSON("http://localhost:8080/api/vehicles/count"),
   fetchJSON("http://localhost:8080/api/trips/count"),         fetchJSON("http://localhost:8080/api/events/count"),
            fetchJSON("http://localhost:8080/"),
            fetchJSON("http://localhost:8080/api/vehicles/latest?limit=5")
        ]);

        // Extract data
        const totalVehicles = vehicleCount.data ?? vehicleCount.data ?? "-";
        const totalEvents = eventCount.data ?? eventCount.data ?? "-";
        const totalTrips = tripCount.data ?? tripCount.data ?? "-";
        const dbSize = dbSizeResp?.database?.size_human ?? "-";
        const latestBuses = Array.isArray(latestBusesResp.data)
            ? latestBusesResp.data.slice(0,15)
            : latestBusesResp.data.slice(0,15) ?? [];

        // Uptime calculation
        const uptimeMs = new Date().getTime() - RUNTIME_STARTED_AT.getTime();
        let seconds = Math.floor(uptimeMs / 1000);
        const months = Math.floor(seconds / (30 * 24 * 3600));
        seconds %= (30 * 24 * 3600);
        const days = Math.floor(seconds / (24 * 3600));
        seconds %= (24 * 3600);
        const hours = Math.floor(seconds / 3600);
        seconds %= 3600;
        const minutes = Math.floor(seconds / 60);
        seconds %= 60;
        const uptimeFmt = `${months}:${days}:${hours}:${minutes}:${seconds}`;

        // HTML output
        let html = `
            <html>
            <head><title>VTS Dashboard</title></head>
            <body>
            <h1>VTS Dashboard</h1>
            <ul>
                <li>Total Vehicle Count: ${totalVehicles}</li>
                <li>Total Trips Count: ${totalTrips}</li>
                <li>Total Event Count: ${totalEvents}</li>
                <li>Database Size: ${dbSize}</li>
                <li>Total Uptime: ${uptimeFmt}</li>
                <li>Booted at: ${RUNTIME_STARTED_AT}</li>
            </ul>
            <h2>Last 15 Added Buses</h2>
<table border="1">
  <thead>
    <tr>
      <th>ID</th>
      <th>License Plate</th>
      <th>Created At</th>
      <th>Last Seen</th>
      <th>Bicycle</th>
      <th>Accessible</th>
      <th>A/C</th>
      <th>Agency ID</th>
    </tr>
  </thead>
  <tbody>
    ${latestBuses.map((bus: any) => `
      <tr href='/api/vehicles/${bus.id}/history?limit=1'>
        <td>${bus.id}</td>
        <td>${bus.license_plate}</td>
        <td>${bus.created_at}</td>
        <td>${bus.last_seen}</td>
        <td>${bus.bicycle ?? ''}</td>
        <td>${bus.accesible ?? ''}</td>
        <td>${bus.ac ?? ''}</td>
        <td>${bus.agency_id ?? ''}</td>
      </tr>
    `).join('')}
  </tbody>
</table>
            </body>
            </html>
        `;
        res.setHeader("Content-Type", "text/html");
        res.send(html);

    } catch (error) {
        console.error(error);
        res.status(500).send("Failed to fetch dashboard data.");
    }
});