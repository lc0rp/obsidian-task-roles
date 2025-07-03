export interface TaskAssignmentSettings {
	contactSymbol: string;
	companySymbol: string;
	contactDirectory: string;
	companyDirectory: string;
	roles: Role[];
	hiddenDefaultRoles: string[];
}

export interface Role {
	id: string;
	name: string;
	icon: string;
	isDefault: boolean;
	order: number;
}

export interface Assignment {
	roleId: string;
	assignees: string[];
}

export interface ParsedAssignment {
	role: Role;
	assignees: string[];
}

export const DEFAULT_ROLES: Role[] = [
	{ id: 'drivers', name: 'Drivers', icon: '🚗', isDefault: true, order: 1 },
	{ id: 'approvers', name: 'Approvers', icon: '👍', isDefault: true, order: 2 },
	{ id: 'contributors', name: 'Contributors', icon: '👥', isDefault: true, order: 3 },
	{ id: 'informed', name: 'Informed', icon: '📢', isDefault: true, order: 4 }
];

export const DEFAULT_SETTINGS: TaskAssignmentSettings = {
	contactSymbol: '@',
	companySymbol: '+',
	contactDirectory: 'Contacts',
	companyDirectory: 'Companies',
	roles: DEFAULT_ROLES,
	hiddenDefaultRoles: []
}; 