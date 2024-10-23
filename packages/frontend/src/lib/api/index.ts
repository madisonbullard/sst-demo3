import { hc } from "hono/client";
import { Resource } from "sst";
import type { AppType } from "api";

export function client(fetch: typeof globalThis.fetch) {
	return hc<AppType>(Resource.ApiRouter.url, {
		fetch,
	});
}
