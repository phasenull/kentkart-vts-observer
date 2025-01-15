import exp from "constants";
import { Router } from "express";
const swaggerJsdoc = require("swagger-jsdoc")
const swaggerUi = require("swagger-ui-express");
export const options = {
	definition: {
		openapi: "3.1.0",
		info: {
			title: "KentKart unofficial VTS Archive API",
			version: "0.1.0",
			description:
				"This is an unofficial API for the KentKart VTS Archive, the data might not be 100% accurate",
			contact: {
				name: "phasenull",
				url: "https://phasenull.dev",
				email: "kk-docs.gw@phasenull.dev",
			},
		},
		servers: [
			{
				url: "http://localhost:8080",
			},
		],
	},
	apis: ["./src/controllers/*.ts"],
};
const SwaggerController = Router()
const specs = swaggerJsdoc(options);
SwaggerController.use(
	"/",
	swaggerUi.serve,
	swaggerUi.setup(specs)
);
export default SwaggerController
