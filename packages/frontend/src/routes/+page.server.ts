import { client } from "$lib/api";
import { redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { Resource } from "sst";

export const load: PageServerLoad = async ({ fetch }) => {
	const res = await client(fetch).index.$get();
	const data = await res.json();
	return data.result;
};

export const actions = {
	default: async ({ request, url }) => {
		const origin = new URL(url).origin;
		const data = await request.formData();

		const email = data.get("email") as string;

		const params = new URLSearchParams({
			email,
			grant_type: "authorization_code",
			client_id: "web",
			redirect_uri: `${origin}/auth/verify`,
			response_type: "code",
			provider: "code",
		}).toString();

		return redirect(
			302,
			`${Resource.AuthRouter.url}/code/authorize?${new URLSearchParams(params)}`,
		);
	},
} satisfies Actions;
