import { EventEmitter } from "events";
import db from "../db";
import { MESSAGES, SUBSCRIBERS } from "../schema";
import { and, eq } from "drizzle-orm";
interface IMessageUpdate {
	update_id: number;
	message: {
		message_id: number;
		from: {
			id: number;
			is_bot: false;
			first_name: string;
			last_name: string;
			username: string;
			language_code: "en";
		};
		chat: {
			id: number;
			first_name: string;
			last_name: string;
			username: string;
			type: "private";
		};
		date: number;
		text: string;
		entities: [
			{
				offset: number;
				length: number;
				type: "bot_command";
			}
		];
	};
}
export class TelegramHelper {
	private readonly API_URL = "https://api.telegram.org/bot";
	public readonly EVENTS = new EventEmitter<{ on_message: [IMessageUpdate] }>();
	public broadcast(message:string) {
		const all_subscribers = db.select().from(SUBSCRIBERS).all();
		all_subscribers.forEach(async (subscriber) => {
			const [data, err] = await this.sendMessage(
				subscriber.chat_id,
				message
			);
			if (err) {
				console.error(
					`Failed to send broadcast message to ${subscriber.username} (${subscriber.chat_id}):`,
					err
				);
			}
		});
	}
	constructor(private bot_token: string) {
		this.API_URL += bot_token;
		this.getMe().then(([data, err]) => {
			if (err) {
				console.error("Failed to initialize TelegramHelper:", err);
			} else {
				console.log("Initialized TelegramHelper for bot:", data);
			}
		});
		this.EVENTS.on("on_message", async (data) => {
			const from = data.message.from.username
				? `@${data.message.from.username}`
				: `${data.message.from.first_name} ${
						data.message.from.last_name || ""
				  }`.trim();
			const chat_id = data.message.chat.id;
			const text = data.message.text;
			console.log(`~New message from ${from} (chat_id: ${chat_id}): ${text}`);
			const [is_subscribed] = await db
				.select()
				.from(SUBSCRIBERS)
				.where(
					and(
						eq(SUBSCRIBERS.chat_id, chat_id.toString()),
						eq(SUBSCRIBERS.username, from)
					)
				)
				.limit(1)
				.all();
			if (!is_subscribed) {
				console.log(`~User ${from} (chat_id: ${chat_id}) is not subscribed.`);
				await db.insert(SUBSCRIBERS).values({
					chat_id: chat_id.toString(),
					username: from,
					created_at: new Date(),
					ip: "unknown",
				});
				await this.sendMessage(
					chat_id.toString(),
					"Welcome! You have been subscribed to VTS updates."
				);
			}
		});
		setInterval(() => {
			this.getUpdates().then(([data, err]) => {
				if (err) {
					console.error("Error fetching updates:", err);
					return;
				}
				if (data && data.result && data.result.length > 0) {
					data.result.forEach(async (update: IMessageUpdate) => {
						if (!update.message || !update.message.text) return;
						const [result] = await db
							.insert(MESSAGES)
							.values({
								chat_id: update.message.chat.id.toString(),
								message_id: update.message.message_id,
								sent_at: new Date(update.message.date * 1000),
								content: update.message.text,
							})
							.returning()
							.onConflictDoNothing();
						if (result) {
							this.EVENTS.emit("on_message", update);
						}
					});
				}
			});
		}, 5000); // Poll every 5 seconds
	}
	public async getMe() {
		return await this.makeCall("/getMe");
	}
	async getUpdates() {
		return await this.makeCall<{ result: IMessageUpdate[] }>("/getUpdates");
	}
	async makeCall<T>(
		endpoint: (typeof TG_ENDPOINTS)[number],
		init?: RequestInit | undefined
	): ProperPromises<T> {
		const method = init?.method || "GET";
		const request = await fetch(`${this.API_URL}${endpoint}`, {
			method: method || "GET",
			...init,
		});
		const response = await request.json();
		if (response) {
			return [response];
		} else {
			return [false, response.description || "unknown error"];
		}
	}
	async sendMessage(chat_id: string, text: string) {
		return await this.makeCall("/sendMessage", {
			method: "POST",
			body: JSON.stringify({
				chat_id: chat_id,
				text: text,
			}),
			headers: {
				"Content-Type": "application/json",
			},
		});
	}
}
export const TG_ENDPOINTS = ["/getMe", "/sendMessage", "/getUpdates"] as const;
export type ProperPromises<T> = Promise<[T] | [false, string]>;
