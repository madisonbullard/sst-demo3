
- BEFORE DEMO
  - Alias `p` to `pnpm` (this was supposed to be a private demo script, and I use that alias. Don't wanna change it now.)
  - create empty [Neon](https://neon.tech/) account
    - sign up and verify account
    - DO NOT follow UI to setup a project (we'll do it programmatically :smirk:)
- Create new AWS account `sst-demo`
  - follow this guide: https://docs.sst.dev/setting-up-aws, which will show you how to:
    - Create an AWS Organization
    - Add a user
    - Assign user to mgmt account
    - Create new AWS accounts for dev and prod
    - Assign user to dev and prod accounts
    - Edit `~/.aws/config` to add SSO profiles
- Create a folder for your repo
- `pnpm init`
- `git init`
- Add `pnpm-workspace.yaml` and `/packages`
  - ```yaml
    packages:
      - "packages/**/*"
    
    ```
- `p add -w sst`
- `p add -w -D typescript`
- `p sst init`
  - **We're gonna prepare our repo for development**
  - Add AWS profile config in package.json scripts and add `sso` script
    - ```json
      "scripts": {
          "dev": "AWS_PROFILE=sst-demo-dev sst dev",
          "sso": "aws sso login --sso-session=sst-demo",
          "deploy": "AWS_PROFILE=sst-demo-dev pnpm sst deploy",
            "check": "pnpm biome check --write ./",
        },
      ```
  - Run `sst dev` if you havent yet to let the MQTT server spin up (can take up to 10 min, in the meantime you'll see an error in the SST logs)
- add `node_modules` to `.gitignore`
- `p add -w -D @tsconfig/node20`
- add tsconfig
  - ```json
    {
      "extends": "@tsconfig/node20/tsconfig.json",
      "compilerOptions": {
        "strict": true,
        "module": "ESNext",
        "moduleResolution": "Bundler"
      }
    }
    
    ```
- Install biome
  - `pnpm add -w -D --save-exact @biomejs/biome && pnpm biome init`
  - ```json
    {
      "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
      "vcs": {
        "enabled": false,
        "clientKind": "git",
        "useIgnoreFile": false
      },
      "files": {
        "ignoreUnknown": false,
            "include": ["**/*.ts", "**/*.json"],
        "ignore": ["node_modules", ".sst", "sst-env.d.ts"]
      },
      "formatter": {
        "enabled": true,
        "indentStyle": "tab"
      },
      "organizeImports": {
        "enabled": true
      },
      "linter": {
        "enabled": true,
        "rules": {
          "recommended": true
        }
      },
      "javascript": {
        "formatter": {
          "quoteStyle": "double"
        }
      },
      "overrides": [
        {
          "include": ["*.svelte"],
          "linter": {
            "rules": {
              "style": {
                "useConst": "off",
                "useImportType": "off"
              }
            }
          }
        }
      ]
    }
    
    ```
- sveltekit
  - `mkdir packages && cd packages && npx sv create frontend`
  - install deps
  - replace adapter in `svelte.config.ts` with `import adapter from "svelte-kit-sst";`
    - `p add --filter frontend -D svelte-kit-sst`
    - `p remove --filter frontend @svelte/adapter-auto`
  - update script to `sst dev vite dev`
- FE infra
  - `infra/frontend.ts`
    - ```ts
      export const site = new sst.aws.SvelteKit("Frontend", {
        path: "packages/frontend",
      })
      ```
  - update `sst.config.ts`
    - ```ts
      async run() {
        const site = await import("./infra/frontend.ts");
        return { frontend: site.url }
      }
      ```
- API
  - We're gonna build an API deployed to a lambda. It's going to be type safe and conform to openapi spec.
  - `pnpm init` packages/api
    - add `"type": "module"`
    - `p add @hono/zod-openapi hono`
    - `p add @types/node -D`
  - copy over tsconfig from root
  - `src/index.ts`
    - ```ts
      import { OpenAPIHono } from "@hono/zod-openapi";
      import { logger } from "hono/logger";
      import { compress } from "hono/compress";
      import { handle, streamHandle } from "hono/aws-lambda";
      
      const app = new OpenAPIHono();
      app.use("*", logger());
      app.use("*", compress());
      
      app.get("/", async (c) => {
        return c.json({
          message: "Hello, world!",
        });
      });
      
      app.doc("/doc", () => ({
        openapi: "3.0.0",
        info: {
          title: "SST Demo API",
          version: "0.0.1",
        },
      }));
      
      export const handler = process.env.SST_LIVE ? handle(app) : streamHandle(app);
      ```
  - Add `api/src/common.ts`
    - ```ts
      import { z } from "zod";
      
      export function Result<T extends z.ZodTypeAny>(schema: T, description: string) {
        return {
          content: {
            "application/json": {
              schema: z.object({
                result: schema,
              }),
            },
          },
          description,
        };
      }
      
      export function ApiError(description: string) {
        return {
          content: {
            "application/json": { schema: z.object({ error: z.string() }) },
          },
          description,
        };
      }
      
      ```
  - update hello world to openapi
    - ```ts
      const routes = app.openapi(
        createRoute({
          method: "get",
          path: "/",
          responses: {
            200: Result(
              z.object({ message: z.literal("Hello, world!") }),
              "Returns 'Hello, world!'",
            ),
          },
        }),
        async (c) => {
          return c.json({ result: { message: "Hello, world!" as const } }, 200);
        },
      );
      
      // ...
      
      export type AppType = typeof routes;
      ```
  - add `infra/api.ts`
    - Add a Cloudfront Function to host router, and a Cloudfront CDN distribution
    - ```js
      const api = new sst.aws.Function("Api", {
        url: true,
        streaming: !$dev,
        handler: "./packages/api/src/index.handler",
      });
      
      export const apiRouter = new sst.aws.Router("ApiRouter", {
        routes: { "/*": api.url },
      });
      
      export const outputs = {
        api: apiRouter.url,
      };
      
      ```
  - update `sst.config.ts`
    - ```ts
      async run() {
          const outputs = {};
          for (const value of readdirSync("./infra/")) {
              const result = await import(`./infra/${value}`);
              if (result.outputs) Object.assign(outputs, result.outputs);
          }
          return outputs;
      }
      ```
  - use it in svelte app
    - add "exports" to api `package.json`
      - ```json
          "exports": {
            ".": "./src/index.ts",
            "./*": [
              "./src/*/index.ts",
              "./src/*.ts"
            ]
          },
        ```
    - add `link` in FE infra
      - ```ts
        import { apiRouter } from "./api";

        export const site = new sst.aws.SvelteKit("Frontend", {
          path: "packages/frontend",
          link: [apiRouter],
        });
        ```
    - `p add --filter frontend api@workspace:^
    - `p add --filter frontend hono`
    - `lib/api/index.ts`
      - ```js
        import { hc } from "hono/client";
        import { Resource } from "sst";
        import type { AppType } from "api";
        
        export function client(fetch: typeof globalThis.fetch) {
          return hc<AppType>(Resource.ApiRouter.url, {
            fetch,
          });
        }
        
        ```
      - update `frontend/tsconfig.json` "include" statement to include `sst-env.d.ts`
        - You need to heed the warning in the tsconfig comment about merging includes/excludes
        - Resulting "include" should look like:
          - ```json
            	"include": [
            		"./.svelte-kit/ambient.d.ts",
            		"./.svelte-kit/non-ambient.d.ts",
            		"./.svelte-kit/types/**/$types.d.ts",
            		"./vite.config.js",
            		"./vite.config.ts",
            		"./src/**/*.js",
            		"./src/**/*.ts",
            		"./src/**/*.svelte",
            		"./tests/**/*.js",
            		"./tests/**/*.ts",
            		"./tests/**/*.svelte",
            		"sst-env.d.ts"
            	]
            ``` 
    - `page.server.ts`
      - ```ts
        import { client } from "$lib/api";
        import type { PageServerLoad } from "./$types";
        
        export const load: PageServerLoad = async ({ fetch }) => {
          const res = await client(fetch).index.$get();
          const data = await res.json();
        
          return data.result;
        };
        
        ```
    - `page.svelte`
      - ```svelte
        <script lang="ts">
          export let data;
        </script>
        
        {data.message}
        
        ```
  - View hello world
- add drizzle
  - add `packages/core`
  - `pnpm init`
  - copy tsconfig from /api
  - Read Drizzle/Neon docs https://orm.drizzle.team/docs/get-started-postgresql#neon-postgres
  - `p sst add neon` see prettier error and `p add -w -D prettier`
  - Create `.env` and add it to .gitignore
    - ```
      NEON_API_KEY=XXXXX
      ```
  - `infra/db.ts`
    - ```ts
      export const project = new neon.Project("SstDemo3", {
        historyRetentionSeconds: 86400,
      });
      
      export const branch = new neon.Branch("Main", {
        projectId: project.id,
      });
      
      export const endpoint = new neon.Endpoint("Endpoint", {
        projectId: project.id,
        branchId: branch.id,
      });
      
      export const role = new neon.Role("DbOwner", {
        projectId: project.id,
        branchId: branch.id,
      });
      
      export const db = new neon.Database("Db", {
        branchId: branch.id,
        projectId: project.id,
        ownerName: role.name,
      });
      
      export const dbProperties = new sst.Linkable("DbProperties", {
        properties: {
          connectionString: $interpolate`postgresql://${role.name}:${role.password}@${endpoint.host}/${db.name}?sslmode=require`,
        },
      });
      
      export const outputs = {
        db: db.id,
      };
      
      ```
  - Add `link: [dbProperties],` to `infra/api.ts`
  - `p add --filter core drizzle-orm @neondatabase/serverless ws bufferutil`
  - `p add -D --filter core drizzle-kit @types/ws`
  - `src/drizzle.config.ts`
    - ```ts
      import { defineConfig } from "drizzle-kit";
      import { Resource } from "sst";
      
      export default defineConfig({
        dialect: "postgresql",
        schema: "./src/**/*.sql.ts",
        out: "./migrations",
        strict: true,
        verbose: true,
        dbCredentials: { url: Resource.DbProperties.connectionString },
      });
      
      ```
  - `core/src/drizzle/index.ts`
    - ```ts
      import { Resource } from "sst";
      import ws from 'ws'
      import { Pool, neonConfig } from "@neondatabase/serverless";
      import { drizzle } from "drizzle-orm/neon-serverless";
      
      neonConfig.webSocketConstructor = ws;
      
      export const db = drizzle(
        new Pool({ connectionString: Resource.NeonDatabaseUrl.value }),
      );
      
      ```
  - `core/package.json`
    - ```json
        "scripts": {
          "db": "AWS_PROFILE=sst-demo-dev pnpm sst shell drizzle-kit",
          "generate": "pnpm db generate",
          "migrate": "pnpm db migrate",
          "db:studio": "pnpm db studio"
        },
      ```
  - `core/src/user/user.sql.ts`
    - ```ts
      import { sql } from "drizzle-orm";
      import {
        pgTable,
        uniqueIndex,
        varchar,
        timestamp as rawTs,
      } from "drizzle-orm/pg-core";
      
      const uuid = (name: string) => varchar(name, { length: 20 });
      
      const timestamp = (name: string) => rawTs(name, { precision: 3, mode: "date" });
      
      const timestamps = {
        timeCreated: timestamp("time_created").notNull().defaultNow(),
        timeUpdated: timestamp("time_updated").notNull().defaultNow(),
        timeDeleted: timestamp("time_deleted"),
      };
      
      export const userTable = pgTable(
        "user",
        {
          id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
          ...timestamps,
          email: varchar("email", { length: 255 }).notNull(),
        },
        (table) => ({
          email: uniqueIndex().on(table.email),
        }),
      );
      
      ```
  - `p --filter core generate`
  - `p --filter core migrate`
  - `p add --filter core zod`
    - We're gonna use zod to define the User interface
  - `core/src/user/index.ts`
    - ```ts
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
      }
      
      
      ```
  - Add export in `core/package.json`
    - ```json
        "exports": {
          "./*.sql": "./src/*.sql.ts",
          "./*.ts": "./src/*.ts",
          "./*": "./src/*.ts"
        }
      ```
  - Add Context/Actor
    - `core/src/context.ts`
      - ```ts
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
        
        ```
    - `core/src/actor.ts`
      - ```ts
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
        
        ```
  - Add `useUser()`
    - `core/src/user/index.ts`
      - ```ts
          export function use() {
            const actor = useActor();
            if (actor.type === "user") return actor.properties.id;
            throw new Error(`Actor is "${actor.type}" not UserActor`);
          }
        ```
- Add `UsersApi`
  - `p add --filter api core@workspace:^`
  - Add `api/src/users.ts`
    - ```ts
      import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
      import { User } from "core/user/index";
      import { ApiError, Result } from "./common";
      
      export namespace UsersApi {
        export const UserSchema = User.Info.openapi("User");
      
        export const route = new OpenAPIHono().openapi(
          createRoute({
            method: "get",
            path: "/me",
            responses: {
              404: ApiError("User not found"),
              200: Result(UserSchema, "Returns user"),
            },
          }),
          async (c) => {
            const result = await User.fromID(User.use());
            if (!result) return c.json({ error: "User not found" }, 404);
            return c.json({ result }, 200);
          },
        );
      }
      
      export const user = new OpenAPIHono().route("/", UsersApi.route);
      
      ```
  - Add user routes to `api/src/index.ts`
    - ```ts
      const routes = app.route("/user", UsersApi.route);
      ```
  - Add form to FE
    - ```svelte
      <script lang="ts">
        import { enhance } from "$app/forms";
      
        export let data;
      </script>
      
      {data.message}
      
      <form use:enhance method="post">
        <input type="email" name="email" />
        <button>Log in or create account</button>
      </form>
      
      ```
    - ```ts
      import { client } from "$lib/api";
      import type { Actions, PageServerLoad } from "./$types";
      
      export const load: PageServerLoad = async ({ fetch }) => {
        const res = await client(fetch).index.$get();
        const data = await res.json();
        return data.result;
      };
      
      export const actions = {
        default: async ({ request }) => {
          const data = await request.formData();
      
          const email = data.get("email") as string;
      
          console.log(email);
        },
      } satisfies Actions;
      
      ```
- We'll handle user creation and login through our auth handler
- Add auth
  - flow
    - pass `email` to `AUTH/code/authorize` with a `redirect_uri` param pointing to a client URL `/auth/callback`
    - `AUTH/code/authorize` will call an `onCodeRequest` fn, return a Redirect to `/auth/verify`
    - User checks email, uses pin code, passed to `AUTH/code/callback` as param
    - `AUTH/code/callback` redirects to the `redirect_uri`
    -
  - `mkdir packages/auth`
  - `cd packages/auth && pnpm init`
  - `pnpm add core@workspace:^`
  - `auth/tsconfig.json`
    - ```json
      {
        "extends": "@tsconfig/node20/tsconfig.json",
        "compilerOptions": {
          "strict": true,
          "module": "ESNext",
          "moduleResolution": "Bundler"
        }
      }
      
      ```
  - `core/src/sessions.ts`
    - ```ts
      import { createSessionBuilder } from "sst/auth";
      
      export const sessions = createSessionBuilder<{
        user: {
          id: string;
          email: string;
        };
      }>();
      
      ```
  - `auth/src/index.ts`
    - ```ts
      import { sessions } from "core/sessions.ts";
      import { auth } from "sst/aws/auth";
      import { CodeAdapter } from "sst/auth/adapter";
      import { z } from "zod";
      
      const claimsSchema = z.object({
        email: z
          .string()
          .min(1, "Please enter an email address")
          .email("Please enter a valid email address"),
      });
      
      export const handler = auth.authorizer({
        session: sessions,
        providers: {
          code: CodeAdapter({
            async onCodeRequest(code, unvalidatedClaims, req) {
              const claims = claimsSchema.parse(unvalidatedClaims);
              console.log(code, claims);
              return new Response("Not Implemented", {
                status: 501,
                headers: { "content-type": "text/plain" },
              });
            },
            async onCodeInvalid(_code, _claims, req) {
              const url = new URL(req.url);
              const redirectUri = url.searchParams.get("redirect_uri");
      
              if (!redirectUri) {
                return new Response("No redirect URI", {
                  status: 400,
                });
              }
      
              return new Response("ok", {
                status: 302,
                headers: {
                  location: `${redirectUri}?error=invalid_code`,
                },
              });
            },
          }),
        },
        callbacks: {
          auth: {
            async allowClient() {
              return true;
            },
            async success(ctx, input) {
              if (input.provider === "code") {
                const email = input.claims.email.toLowerCase();
                console.log(email);
              }
      
              return new Response("Not Supported", {
                status: 400,
                headers: { "content-type": "text/plain" },
              });
            },
          },
        },
      });
      
      ```
  - Auth infra
    - `infra/secret.ts`
      - ```ts
        export const secret = {
          DevEmailAddress: new sst.Secret("DevEmailAddress"),
        };
        
        ```
    - `infra/email.ts`
      - ```ts
          import { secret } from "./secret";
          
          export const email = new sst.aws.Email("Email", {
          sender: secret.DevEmailAddress.value,
          });
          
        ```
      - Once deployed, check email to verify with AWS
    - `infra/auth.ts`
      - ```ts
          import { email } from "./email";
          
          export const auth = new sst.aws.Auth("Auth", {
          authenticator: {
            link: [email],
            handler: "./packages/auth/src/index.handler",
          },
          });
          
          export const authRouter = new sst.aws.Router("AuthRouter", {
          routes: { "/*": auth.url },
          });
          
          export const outputs = {
          auth: authRouter.url,
          };
          
        ```
    - Link to frontend
      - ```ts
        import { apiRouter } from "./api";
        import { authRouter } from "./auth";
        
        export const site = new sst.aws.SvelteKit("Frontend", {
          path: "packages/frontend",
          link: [apiRouter, authRouter],
        });
        
        export const outputs = {
          site: site.url,
        };
        
        ```
  - Update form to hit auth router
    - `routes/+page.server.ts`
      - ```ts
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
          },`
        } satisfies Actions;
        ```
    - `auth/src/index.ts`
      - ```ts
        async onCodeRequest(code, unvalidatedClaims, req) {
            const url = new URL(req.url);
            const redirectUri = url.searchParams.get("redirect_uri");
        
            if (!redirectUri) {
                return new Response("No redirect URI", {
                    status: 400,
                });
            }
        
            const claims = claimsSchema.parse(unvalidatedClaims);
        
            console.log(code, claims);
            return new Response("ok", {
                status: 302,
                headers: {
                    location: redirectUri,
                },
            });
        },
        ```
    - `frontend/src/routes/auth/verify/+page.svelte`
      - ```svelte
        <script lang="ts">
          import { enhance } from "$app/forms";
        </script>
        
        <svelte:head>
          <title>Verify Code</title>
          <meta name="description" content="Verify your email address to sign in" />
        </svelte:head>
        
        <h1>Verify code sent to your email</h1>
        <form use:enhance method="post">
          <input name="code" type="text" />
          <button type="submit">Verify</button>
        </form>
        
        ```
    - `frontend/src/routes/auth/verify/+page.server.ts`
      - ```ts
        import { Resource } from "sst";
        import type { Actions } from "./$types";
        import { redirect } from "@sveltejs/kit";
        
        export const actions = {
          default: async ({ request }) => {
            const data = await request.formData();
        
            const code = data.get("code") as string;
        
            return redirect(
              302,
              `${Resource.AuthRouter.url}/code/callback?${new URLSearchParams({ code })}`,
            );
          },
        } satisfies Actions;
        
        ```
  - So now we can see our auth flow is almost ready, but the user can't receive their code yet. Lets add email support.
    - `p add --filter auth @aws-sdk/client-sesv2`
    - Instantiate client `const ses = new SESv2Client({});`
    - link `email` to `auth`
    - `auth/src/index.ts`
      - ```ts
        const from = `SST Demo <${Resource.Email.sender}>`;
        
        const cmd = new SendEmailCommand({
            Destination: { ToAddresses: [claims.email] },
            FromEmailAddress: from,
            Content: {
                Simple: {
                    Body: {
                        Html: { Data: `Your pin code is <strong>${code}</strong>` },
                        Text: { Data: `Your pin code is ${code}` },
                    },
                    Subject: { Data: `Pin code: ${code}` },
                },
            },
        });
        await ses.send(cmd);
        ```
  - Finally, we need to handle user creation/login when the code is valid
    - `auth/src/index.ts`
      - ```ts
        async success(ctx, input) {
          if (input.provider === "code") {
              const email = input.claims.email.toLowerCase();
              let user = await User.fromEmail(email);
              if (!user) {
                  const newUser = await withActor(
                      { type: "public", properties: {} },
                      async () => {
                          return User.create(email);
                      },
                  );
                  if (!newUser) {
                      return new Response("User creation failed", {
                          status: 500,
                          headers: { "content-type": "text/plain" },
                      });
                  }
                  user = newUser;
              }
              if (!user) {
                  return new Response("User creation failed", {
                      status: 500,
                      headers: { "content-type": "text/plain" },
                  });
              }
              return ctx.session({
                  type: "user",
                  properties: {
                      id: user.id,
                      email: user.email,
                  },
              });
          }
        
          return new Response("Not Supported", {
              status: 400,
              headers: { "content-type": "text/plain" },
          });
        },
        ```
    - Link DbProperties in auth and restart dev
  - Now we need to handle the auth callback in our frontend
    - `p add --filter frontend zod`
    - `frontend/src/routes/auth/verify/+page.server.ts`
      - ```ts
        const tokenResponseSchema = z.object({
          access_token: z.string(),
        });
        
        export const load: PageServerLoad = async ({ url, fetch, cookies }) => {
          const code = url.searchParams.get("code");
          if (!code) return;
        
          const response = await fetch(`${Resource.AuthRouter.url}/token`, {
            method: "POST",
            headers: { Accept: "application/json" },
            body: new URLSearchParams({
              grant_type: "authorization_code",
              client_id: "web",
              code,
              redirect_uri: `${url.origin}${url.pathname}`,
            }),
          });
        
          let tokenResponse: z.infer<typeof tokenResponseSchema>;
        
          try {
            const json = await response.json();
            tokenResponse = tokenResponseSchema.parse(json);
          } catch (e) {
            console.error(e);
            return redirect(302, "/");
          }
        
          const { access_token } = tokenResponse;
        
          cookies.set("access_token", access_token, { path: "/" });
        
          return redirect(302, "/profile");
        };
        ```
- Add profile FE
  - `routes/profile/+page.server.ts`
    - ```ts
      import type { PageServerLoad } from "./$types";
      import { client } from "$lib/api";
      import { error } from "@sveltejs/kit";
      
      export const load: PageServerLoad = async ({ fetch }) => {
        const res = await client(fetch).user.me.$get();
      
        const json = await res.json();
      
        if ("error" in json) throw error(500, { message: json.error });
      
        return { email: json.result.email };
      };
      ```
  - `routes/profile/+page.svelte`
    - ```svelte
      <script lang="ts">
        import type { PageData } from "./$types";
      
        export let data: PageData;
      
        $: jsonprettify = JSON.stringify(data, null, 2);
      </script>
      
      <h1>Profile</h1>
      <pre>{@html jsonprettify}</pre>
      
      ```
  - See error "actor context was not provided"
- `api/src/middleware/auth.ts`
  - ```ts
    import { type Actor, withActor } from "core/actor.ts";
    import { sessions } from "core/sessions.ts";
    import type { MiddlewareHandler } from "hono";
    import { HTTPException } from "hono/http-exception";
    
    export const AuthMiddleware: MiddlewareHandler = async (c, next) => {
      const authorization = c.req.header("authorization");
      if (!authorization) {
        throw new HTTPException(403, {
          message: "Authorization header is required",
        });
      }
    
      const token = authorization.split(" ")[1];
      if (!token) {
        throw new HTTPException(403, {
          message: "Bearer token is required",
        });
      }
    
      const actor: Actor = await sessions.verify(token);
    
      await withActor(actor, next);
    };
    
    ```
- Link `auth` to `api` and restart dev
- use middleware
  - `api/src/users.ts`
    - ```ts
      export const user = new OpenAPIHono()
        .use("*", AuthMiddleware)
        .route("/", UsersApi.route);
      ```
- `frontend/src/routes/profile/+page.server.ts`
  - ```ts
    const res = await client(fetch).user.me.$get(
        {},
        {
            headers: {
                Authorization: `Bearer ${cookies.get("access_token")}`,
            },
        },
    );
    ```
