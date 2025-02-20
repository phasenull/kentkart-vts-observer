import { VTSController } from "./controllers/VTSController";
import { VehicleController } from "./controllers/VehicleController";
import SwaggerController from "./swagger";
import { Router } from "express";
const fs = require("fs")
const RUNTIME_STARTED_AT = new Date()
export const SERVER = Router()
const path = require("path");
function getDatabaseSize() {
	const stats = fs.statSync("VTS.db")
	const fileSizeInBytes = stats.size
	return fileSizeInBytes
}
SERVER.use("/docs",SwaggerController)
SERVER.use("/api/vts", VTSController);
SERVER.use("/api/vehicles", VehicleController);

SERVER.get("/download", async (req, res) => {
	const filePath = path.resolve("VTS.db");
	const utcDate = new Date().toISOString();
	const downloadFileName = `VTS-${utcDate}.db`;
	res.download(filePath, downloadFileName, (err) => {
		if (err) {
			console.error("Error downloading the file:", err);
			res.status(500).send("Error downloading the file.");
		}
	});
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