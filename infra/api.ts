const api = new sst.aws.Function("Api", {
	url: true,
	streaming: !$dev,
	handler: "./packages/api/src/index.handler",
});

export const apiRouter = new sst.aws.Router("ApiRouter", {
	routes: { "/*": api.url },
});

export const outputs = {
	api: apiRouter.url,
};
