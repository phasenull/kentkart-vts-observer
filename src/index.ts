// crono job to fetch data from GTFS-RT and store it in the database
//
// node-cron
import EventEmitter from "events";
import { CRON_JOB } from "./cronjob";
import { SERVER } from "./server";
const PORT = process.env.PORT || 8080;
export const GLOBAL_EVENTS = new EventEmitter<{
	fallback_triggered: [
		| {
				is_fallback: true;
				auth_token: string;
				auth_type: "4" | "3";
		  }
		| { is_fallback: false }
	];
}>();
let tg: TelegramHelper;
export const AUTH_SERVICE = "https://auth.kentkart.com/rl1";
export { tg };
export const FALLBACK_STATE: {
	is_fallback: boolean;
	auth_token?: string;
	auth_type?: "4" | "3";
	created_at?: number;
} = {
	is_fallback: false,
};
export function triggerFallbackMode() {
	if (isMainThread) {
		console.warn(
			"triggerFallbackMode should be called from worker thread only"
		);
		return;
	}

	if (FALLBACK_STATE.is_fallback) {
		return;
	}
	GLOBAL_EVENTS.emit("fallback_triggered", {
		is_fallback: true,
		auth_token: KentKartHelper.access_token || "",
		auth_type: (process.env.AUTH_TYPE as "4" | "3") || "4",
	});
	FALLBACK_STATE.is_fallback = true;
	FALLBACK_STATE.auth_token = KentKartHelper.access_token || "";
	FALLBACK_STATE.auth_type = (process.env.AUTH_TYPE as "4" | "3") || "4";
	FALLBACK_STATE.created_at = Date.now();
}

export function clearFallbackMode() {
	if (!FALLBACK_STATE.is_fallback) {
		return;
	}
	FALLBACK_STATE.is_fallback = false;
	GLOBAL_EVENTS.emit("fallback_triggered", { is_fallback: false });
}

import { Worker, isMainThread, parentPort, workerData } from "worker_threads";
import { TelegramHelper } from "./helpers/TelegramHelper";
import { KentKartHelper } from "./helpers/KentKartHelper";
import { exit } from "process";
console.log("~STARTING A NEW NODE PROCESS - isMainThread =", isMainThread);

async function main() {
	if (isMainThread) {
		console.log("~Starting SERVER");
		require("express")()
			.use(SERVER)
			.listen(PORT, () => {
				console.log(`~Server started on port ${PORT}`);
			});
		console.log("~Starting WORKER");
		const worker = new Worker(__filename, {
			workerData: "Hello from root process!",
		});
	} else {
		const tg = new TelegramHelper(process.env.TELEGRAM_BOT_TOKEN || "");
		GLOBAL_EVENTS.on("fallback_triggered", async (data) => {
			if (!data.is_fallback) {
				tg.broadcast(
					"✅ Fallback mode deactivated. Resuming normal data fetching."
				);
				return;
			}
			console.log(
				"~FALLBACK TRIGGERED - fetching from RL1 with token instead."
			);
			tg.broadcast(
				"⚠️ Fallback mode activated. Fetching data from RL1 source. Data accuracy may be affected."
			);
			setTimeout(() => {
				GLOBAL_EVENTS.emit("fallback_triggered", { is_fallback: false });
			}, 15 * 60 * 1000);
		});
		const [data,err] = await KentKartHelper.getAccessTokenFromRefreshToken(
			process.env.KENTKART_RL1_REFRESH_TOKEN || ""
		);
		if (!data || err) {
			console.error("~Failed to get KentKart tokens:", err);
			return
		}
		const {access_token} = data
		if (!access_token ) {
			console.error("~Invalid KentKart tokens received");
			tg.broadcast("❌ Failed to obtain KentKart tokens. Worker process exiting.");
			return exit(-1)
		}
		console.log("~Obtained KentKart tokens:", access_token );
		tg.broadcast("✅ Successfully obtained KentKart tokens. Starting worker process.");
		console.log("~Worker started with data:", workerData);
		console.log("~Starting CRON_JOB");
		CRON_JOB();
	}
	
}
main()