import { sessions } from "core/sessions.ts";
import { auth } from "sst/auth";
import { CodeAdapter } from "sst/auth/adapter";
import { z } from "zod";

const claimsSchema = z.object({
	email: z
		.string()
		.min(1, "Please enter an email address")
		.email("Please enter a valid email address"),
});

// export const handler = auth.authorizer({
//   session: sessions,
//   providers: {
//     code: CodeAdapter({
//       async onCodeRequest(code, unvalidatedClaims, req) {
//         const referrer = req.heards/get("referer")
//       },
//       onCodeInvalid
//     })
//   }
// })
