export class TelegramHelper {
    private readonly API_URL = "https://api.telegram.org/bot"
    constructor(private bot_token: string) {
        this.API_URL += bot_token
        this.getMe().then(([data,err])=>{
            if (err) {
                console.error("Failed to initialize TelegramHelper:",err)
            } else {
                console.log("Initialized TelegramHelper for bot:",data)
            }
        })
    }
    public async getMe() {
        return await this.makeCall("/getMe")
    }
    async makeCall<T>(endpoint:typeof TG_ENDPOINTS[number]): ProperPromises<T> {
        return [{} as T]
    }
}
export const TG_ENDPOINTS = [
    "/getMe",
] as const
export type ProperPromises<T> = Promise<[T] | [false,string]>