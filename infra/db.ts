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
