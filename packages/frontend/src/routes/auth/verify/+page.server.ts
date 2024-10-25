import { Resource } from "sst";
import type { Actions } from "./$types";
import { redirect } from "@sveltejs/kit";

export const actions = {
	default: async ({ request, url }) => {
		const data = await request.formData();

		// TODO: handle errors if missing
		const code = data.get("code") as string;

		return redirect(
			302,
			`${Resource.AuthRouter.url}/code/callback?${new URLSearchParams({
				code,
				redirect_uri: `${url.origin}/auth/callback`,
			})}`,
		);
	},
} satisfies Actions;
