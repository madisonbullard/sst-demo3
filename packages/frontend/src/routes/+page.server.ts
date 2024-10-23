import { client } from "$lib/api";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ fetch }) => {
	const res = await client(fetch).index.$get();
	const data = await res.json();

	return data.result;
};
