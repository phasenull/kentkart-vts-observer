// crono job to fetch data from GTFS-RT and store it in the database
//
// node-cron
import { CRON_JOB } from "./cronjob"
import { SERVER } from "./server"
require("dotenv").config()
const PORT = process.env.PORT || 8080

import {Worker,isMainThread,parentPort, workerData} from "worker_threads"
console.log("~STARTING A NEW NODE PROCESS - isMainThread =",isMainThread)
if (isMainThread) {
	console.log("~Starting SERVER")
	require("express")().use(SERVER).listen(PORT, () => {
		console.log(`~Server started on port ${PORT}`)
	})
	console.log("~Starting WORKER")
	const worker = new Worker(__filename, { workerData: 'Hello from root process!' });
} else {
	console.log("~Worker started with data:",workerData)
	console.log("~Starting CRON_JOB")
	CRON_JOB()
}