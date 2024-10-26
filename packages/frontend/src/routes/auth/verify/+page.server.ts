import { Resource } from "sst";
import type { Actions } from "./$types";
import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { z } from "zod";

const tokenResponseSchema = z.object({
	access_token: z.string(),
});

export const load: PageServerLoad = async ({ url, fetch, cookies }) => {
	const code = url.searchParams.get("code");
	if (!code) return;

	const response = await fetch(`${Resource.AuthRouter.url}/token`, {
		method: "POST",
		headers: { Accept: "application/json" },
		body: new URLSearchParams({
			grant_type: "authorization_code",
			client_id: "web",
			code,
			redirect_uri: `${url.origin}${url.pathname}`,
		}),
	});

	let tokenResponse: z.infer<typeof tokenResponseSchema>;

	try {
		const json = await response.json();
		tokenResponse = tokenResponseSchema.parse(json);
	} catch (e) {
		console.error(e);
		return redirect(302, "/");
	}

	const { access_token } = tokenResponse;

	cookies.set("access_token", access_token, { path: "/" });

	return redirect(302, "/profile");
};

export const actions = {
	default: async ({ request }) => {
		const data = await request.formData();

		const code = data.get("code") as string;

		return redirect(
			302,
			`${Resource.AuthRouter.url}/code/callback?${new URLSearchParams({ code })}`,
		);
	},
} satisfies Actions;
