import { createSessionBuilder } from "sst/auth";

export const sessions = createSessionBuilder<{
	user: {
		id: string;
		email: string;
	};
}>();
