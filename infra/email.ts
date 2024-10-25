import { secret } from "./secret";

export const email = new sst.aws.Email("Email", {
	sender: secret.DevEmailAddress.value,
});
