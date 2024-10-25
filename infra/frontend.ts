import { apiRouter } from "./api";
import { authRouter } from "./auth";

export const site = new sst.aws.SvelteKit("Frontend", {
	path: "packages/frontend",
	link: [apiRouter, authRouter],
});

export const outputs = {
	site: site.url,
};
