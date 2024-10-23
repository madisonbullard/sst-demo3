import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { handle, streamHandle } from "hono/aws-lambda";
import { compress } from "hono/compress";
import { logger } from "hono/logger";
import { Result } from "./common";

const app = new OpenAPIHono();
app.use("*", logger());
app.use("*", compress());
app.use("*", async (c, next) => {
	await next();
});

app.openAPIRegistry.registerComponent("securitySchemes", "Bearer", {
	type: "http",
	scheme: "bearer",
});

const routes = app.openapi(
	createRoute({
		method: "get",
		path: "/",
		responses: {
			200: Result(z.object({ message: z.string() }), "Returns 'Hello, world!'"),
		},
	}),
	async (c) => {
		return c.json({ result: { message: "Hello, world!" } }, 200);
	},
);

app.doc("/doc", () => ({
	openapi: "3.0.0",
	info: {
		title: "SST Demo API",
		version: "1.0.0",
	},
}));

export type AppType = typeof routes;

export const handler = process.env.SST_LIVE ? handle(app) : streamHandle(app);
