import { Resource } from "sst";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { drizzle } from "drizzle-orm/neon-serverless";

neonConfig.webSocketConstructor = ws;

console.log(Resource.DbProperties.connectionString);

const connectionString = Resource.DbProperties.connectionString;
export const db = drizzle(new Pool({ connectionString }));
