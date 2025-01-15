declare global {
	namespace NodeJS {
		interface ProcessEnv {
			PORT: number;
			DATABASE_URL: string;
			VTS_CLEANUP_TRIGGER: string;
			VTS_REFETCH_INTERVAL: string,
			KENTKART_REGION: string,
		}
	}
}
export {}