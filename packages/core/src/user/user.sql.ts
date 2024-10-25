import {
	pgTable,
	uniqueIndex,
	varchar,
	uuid,
	timestamp as rawTs,
} from "drizzle-orm/pg-core";

const timestamp = (name: string) => rawTs(name, { precision: 3, mode: "date" });

const timestamps = {
	timeCreated: timestamp("time_created").notNull().defaultNow(),
	timeUpdated: timestamp("time_updated").notNull().defaultNow(),
	timeDeleted: timestamp("time_deleted"),
};

export const userTable = pgTable(
	"user",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		...timestamps,
		email: varchar("email", { length: 255 }).notNull(),
	},
	(table) => ({
		email: uniqueIndex().on(table.email),
	}),
);
