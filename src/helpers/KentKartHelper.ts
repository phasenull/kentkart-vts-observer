import { AUTH_SERVICE, tg } from "..";
import { ProperPromises } from "./TelegramHelper";

export abstract class KentKartHelper {
    public static access_token: string | undefined;
	static async getAccessTokenFromRefreshToken(
		refresh_token: string
	): ProperPromises<{ access_token: string }> {
		const url = `${AUTH_SERVICE}/oauth/token?${new URLSearchParams({
			region: process.env.KENTKART_REGION || "004",
			authType: process.env.AUTH_TYPE || "4",
		}).toString()}`;
		const body = {
			clientId: "rH7S2",
			clientSecret: "Om121T12fSv1j66kp9Un5vE9IMkJ3639", // secret for web client
			redirectUri: "m.kentkart.com",
			refreshToken: refresh_token,
			grantType: "refreshToken",
		};
		const request = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body),
		});
		if (!request.ok) {
			const text = await request.text();
			return [
				false,
				`Failed to get access token from refresh token: ${request.status} ${text}`,
			];
		}
        const data = await request.json() as {
            accessToken: string;

        };
        console.log("Got access token from refresh token:", {data});
        if (!data.accessToken) {
            return [false, 'No access token received from KentKart auth service']
        }
        KentKartHelper.access_token = data.accessToken;
        return [{access_token: data.accessToken}];
	}
}
