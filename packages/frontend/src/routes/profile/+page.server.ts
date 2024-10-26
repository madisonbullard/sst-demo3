import type { PageServerLoad } from "./$types";
import { client } from "$lib/api";
import { error } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ fetch, cookies }) => {
	const res = await client(fetch).user.me.$get(
		{},
		{
			headers: {
				Authorization: `Bearer ${cookies.get("access_token")}`,
			},
		},
	);

	const json = await res.json();

	if ("error" in json) throw error(500, { message: json.error });

	return { email: json.result.email };
};
