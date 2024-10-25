import { eq } from "drizzle-orm";
import { db } from "../drizzle";
import { userTable } from "./user.sql";
import { z } from "zod";
import { useActor } from "../actor";

export namespace User {
	export const Info = z.object({
		id: z.string(),
		email: z.string().email(),
	});

	export const create = async (email: string) =>
		(await db.insert(userTable).values({ email }).returning()).at(0);

	export const fromID = async (id: string) =>
		(await db.select().from(userTable).where(eq(userTable.id, id))).at(0);

	export const fromEmail = async (email: string) =>
		(await db.select().from(userTable).where(eq(userTable.email, email))).at(0);

	export function use() {
		const actor = useActor();
		if (actor.type === "user") return actor.properties.id;
		throw new Error(`Actor is "${actor.type}" not UserActor`);
	}
}
