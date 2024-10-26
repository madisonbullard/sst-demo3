import { sessions } from "core/sessions.ts";
import { auth } from "sst/aws/auth";
import { CodeAdapter } from "sst/auth/adapter";
import { z } from "zod";
import { SendEmailCommand, SESv2Client } from "@aws-sdk/client-sesv2";
import { Resource } from "sst";
import { User } from "core/user/index.ts";
import { withActor } from "core/actor.ts";

const ses = new SESv2Client({});

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
				const url = new URL(req.url);
				const redirectUri = url.searchParams.get("redirect_uri");

				if (!redirectUri) {
					return new Response("No redirect URI", {
						status: 400,
					});
				}

				const claims = claimsSchema.parse(unvalidatedClaims);

				console.log(code, claims);

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

				return new Response("ok", {
					status: 302,
					headers: {
						location: redirectUri,
					},
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
		},
	},
});
