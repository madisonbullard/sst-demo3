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