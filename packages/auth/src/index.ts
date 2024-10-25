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
				const url = new URL(req.url);
				const params = new URLSearchParams(url.search);
				const redirectUri = params.get("redirect_uri");

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
			async onCodeInvalid(_code, _claims, req) {
				const url = new URL(req.url);
				const params = new URLSearchParams(url.search);
				const redirectUri = params.get("redirect_uri");

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
