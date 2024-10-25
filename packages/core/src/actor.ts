import { Context } from "./context";

export type UserActor = {
	type: "user";
	properties: {
		email: string;
		id: string;
	};
};

export type SystemActor = {
	type: "system";
	properties: Record<never, never>;
};

export type PublicActor = {
	type: "public";
	properties: Record<never, never>;
};

export type Actor = UserActor | SystemActor | PublicActor;

export const { use: useActor, with: withActor } =
	Context.create<Actor>("actor");

export function assertActor<T extends Actor["type"]>(type: T) {
	const actor = useActor();
	if (actor.type !== type) {
		throw new Error(`Expected actor type ${type}, got ${actor.type}`);
	}

	return actor as Extract<Actor, { type: T }>;
}
