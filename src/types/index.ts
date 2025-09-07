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
    names: string[];
    pluralNames?: Record<string, string>;
    description: string;
    icon: string;
    shortcuts: string[];
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
        id: "owner",
        names: ["owner", "user", "responsible", "driver", "assignee"],
        pluralNames: { responsible: "responsible" },
        description:
            "Executes the task, or drives the decision. For basic task assignment, keep this role and disable the rest.",
        icon: "👤",
        shortcuts: ["o", "u", "r", "d", "a"],
        order: 1,
    },
    {
        id: "approver",
        names: ["approver", "accountable", "reviewer", "authorizer"],
        description:
            "Signs-off and has ultimate accoutability for the task or decision.",
        icon: "👍",
        shortcuts: ["a", "r"],
        order: 2,
    },
    {
        id: "contributor",
        names: ["contributor", "consulted", "supporter", "participant"],
        description:
            "Provides input, data or other contributions to the task or decision.",
        icon: "👥",
        shortcuts: ["c", "s", "p"],
        order: 3,
    },
    {
        id: "informed",
        names: ["informed", "stakeholder"],
        description: "Kept in the loop and informed of progress or outcomes.",
        icon: "📢",
        shortcuts: ["i"],
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
