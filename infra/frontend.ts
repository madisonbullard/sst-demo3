import { apiRouter } from "./api";

export const site = new sst.aws.SvelteKit("Frontend", {
	path: "packages/frontend",
	link: [apiRouter],
});

export const outputs = {
	site: site.url,
};
