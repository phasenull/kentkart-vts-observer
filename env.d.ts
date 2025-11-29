declare global {
	namespace NodeJS {
		interface ProcessEnv {
			// default: 8080
			PORT: number;
			
			// the code does not respect this variable, database name must always be "VTS.db"
			DATABASE_URL: string;
			
			// default: "0 0 1 * *"
			VTS_CLEANUP_TRIGGER: string;
			
			// default: "*/60 * * * * *"
			VTS_REFETCH_INTERVAL: string,
			
			// default: 004
			KENTKART_REGION: string,
			
			// default: https://service.kentkart.com/rl1/web
			KENTKART_WEB_SERVICE_URL:string

			// default: https://service.kentkart.com/rl1/api
			KENTKART_RL1_API_SERVICE_URL:string
			
			// default: https://service.kentkart.com/api
			KENTKART_LEGACY_API_SERVICE_URL:string
			DEV?:boolean
			TELEGRAM_BOT_TOKEN:string
		}
	}
}
export {}