import { auth } from "./auth";
import { dbProperties } from "./db";

const api = new sst.aws.Function("Api", {
	url: true,
	streaming: !$dev,
	handler: "./packages/api/src/index.handler",
	link: [dbProperties, auth],
});

export const apiRouter = new sst.aws.Router("ApiRouter", {
	routes: { "/*": api.url },
});

export const outputs = {
	api: apiRouter.url,
};
