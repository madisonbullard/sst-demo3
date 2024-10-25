import { AsyncLocalStorage } from "node:async_hooks";

export class ContextNotFoundError extends Error {
	constructor(public name: string) {
		super(
			`${name} context was not provided. It is possible you have multiple versions of SST installed.`,
		);
	}
}

export type Context<T> = ReturnType<typeof create<T>>;

export function create<T>(name: string) {
	const storage = new AsyncLocalStorage<{
		value: T;
	}>();

	const ctx = {
		name,
		with<R>(value: T, cb: () => R) {
			return storage.run({ value }, () => {
				return cb();
			});
		},
		use() {
			const result = storage.getStore();
			if (result === undefined) throw new ContextNotFoundError(name);
			return result.value;
		},
	};
	return ctx;
}

export const Context = {
	create,
};
