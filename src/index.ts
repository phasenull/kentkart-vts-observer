// crono job to fetch data from GTFS-RT and store it in the database
//
// node-cron
import EventEmitter from "events"
import { CRON_JOB } from "./cronjob"
import { SERVER } from "./server"
const PORT = process.env.PORT || 8080
export const EVENT_EMITTER = new EventEmitter<{"fallback_triggered":[{
	is_fallback: true,
	auth_token:string,
	auth_type:"004"
}|{is_fallback:false}]}>()
export const tg = new TelegramHelper(process.env.TELEGRAM_BOT_TOKEN || "")
EVENT_EMITTER.on("fallback_triggered",(data)=>{
	console.log("~FALLBACK TRIGGERED - fetching from RL1 with token instead.")

	setTimeout(()=>{
		EVENT_EMITTER.emit("fallback_triggered",{is_fallback:false})
	},15*60*1000) // every 15 minutes
})
import {Worker,isMainThread,parentPort, workerData} from "worker_threads"
import { TelegramHelper } from "./helpers/TelegramHelper"
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