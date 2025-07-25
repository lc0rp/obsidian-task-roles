export interface TaskRolesPluginSettings {
	personSymbol: string;
	companySymbol: string;
	personDirectory: string;
	companyDirectory: string;
	roles: Role[];
	hiddenDefaultRoles: string[];
	savedViews: ViewConfiguration[];
	autoApplyFilters: boolean;
	taskDisplayMode: "minimal" | "detailed";
	resultLimit: number;
	debug: boolean;
	compatMode: boolean;
	compatModeUserSet: boolean;
	showInlineWidgets: boolean;
}

export interface Role {
	id: string;
	name: string;
	icon: string;
	/** Single letter shortcut used for quick role selection */
	shortcut?: string;
	isDefault: boolean;
	order: number;
}

export interface TaskRoleAssignment {
	roleId: string;
	assignees: string[];
}

export interface ParsedTaskRoleAssignment {
	role: Role;
	assignees: string[];
}

// Task data structures for caching and views
export interface TaskData {
	id: string;
	filePath: string;
	lineNumber: number;
	content: string;
	description: string;
	searchText: string;
	status: TaskStatus;
	priority: TaskPriority;
	tags: string[];
	roleAssignments: ParsedTaskRoleAssignment[];
	dates: TaskDates;
	createdDate: Date;
	modifiedDate: Date;
}

export interface TaskDates {
	due?: Date;
	done?: Date;
	scheduled?: Date;
	start?: Date;
	created?: Date;
	cancelled?: Date;
	happens?: Date;
	completed?: Date;
}

export enum TaskStatus {
	TODO = "todo",
	IN_PROGRESS = "in-progress",
	DONE = "done",
	CANCELLED = "cancelled",
}

export enum TaskPriority {
	HIGHEST = "highest",
	HIGH = "high",
	MEDIUM = "medium",
	NONE = "none",
	LOW = "low",
	LOWEST = "lowest",
}

// View configuration types
export interface ViewConfiguration {
	id: string;
	name: string;
	layout: ViewLayout;
	filters: ViewFilters;
	sortBy: SortOption;
	createdDate: Date;
}

export enum ViewLayout {
	STATUS = "status",
	ROLE = "role",
	ASSIGNEES = "assignees",
	DATE = "date",
}

export interface ViewFilters {
	roles?: string[];
	people?: string[];
	companies?: string[];
	statuses?: TaskStatus[];
	priorities?: TaskPriority[];
	tags?: string[];
	dateRange?: DateRange;
	dateType?: DateType;
	textSearch?: string;
}

export interface DateRange {
	from?: Date;
	to?: Date;
	includeNotSet?: boolean;
}

export enum DateType {
	DUE = "due",
	DONE = "done",
	SCHEDULED = "scheduled",
	START = "start",
	CREATED = "created",
	CANCELLED = "cancelled",
	HAPPENS = "happens",
}

export const TASK_DATE_ICONS: Record<keyof TaskDates, string> = {
	due: "📅",
	done: "✅",
	scheduled: "⏳",
	start: "🟢",
	created: "🗓️",
	cancelled: "🚫",
	happens: "🔄",
	completed: "✅",
};

export interface SortOption {
	field:
		| "urgency"
		| "description"
		| "created"
		| "modified"
		| "due"
		| "name"
		| "recency";
	direction: "asc" | "desc";
}

// View state for organizing tasks
export interface ViewColumn {
	id: string;
	title: string;
	tasks: TaskData[];
	isUserColumn?: boolean; // For role view - indicates if this is the user's column
}

export const DEFAULT_ROLES: Role[] = [
	{
		id: "assign",
		name: "Assign",
		icon: "👤",
		shortcut: "a",
		isDefault: false,
		order: 0,
	},
	{
		id: "drivers",
		name: "Drivers",
		icon: "🚗",
		shortcut: "d",
		isDefault: true,
		order: 1,
	},
	{
		id: "approvers",
		name: "Approvers",
		icon: "👍",
		shortcut: "a",
		isDefault: true,
		order: 2,
	},
	{
		id: "contributors",
		name: "Contributors",
		icon: "👥",
		shortcut: "c",
		isDefault: true,
		order: 3,
	},
	{
		id: "informed",
		name: "Informed",
		icon: "📢",
		shortcut: "i",
		isDefault: true,
		order: 4,
	},
];

export const DEFAULT_SETTINGS: TaskRolesPluginSettings = {
	personSymbol: "@",
	companySymbol: "+",
	personDirectory: "People",
	companyDirectory: "Companies",
	roles: DEFAULT_ROLES,
	hiddenDefaultRoles: [],
	savedViews: [],
	autoApplyFilters: true,
	taskDisplayMode: "detailed",
	resultLimit: 50,
	debug: false,
	compatMode: false,
	compatModeUserSet: false,
	showInlineWidgets: true,
};

export const ROLE_ASSIGNMENT_COMMENT_START = "<!--TA-->";
export const ROLE_ASSIGNMENT_COMMENT_END = "<!--/TA-->";
