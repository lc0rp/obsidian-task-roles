export interface TaskRolesPluginSettings {
    contactSymbol: string;
    companySymbol: string;
    contactDirectory: string;
    companyDirectory: string;
    roles: Role[];
    hiddenDefaultRoles: string[];
    savedViews: ViewConfiguration[];
    autoApplyFilters: boolean;
    useCompactFilters: boolean;
    useTaskQueries: boolean;
    debug: boolean;
    compatMode: boolean;
    compatModeUserSet: boolean;
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

export interface RoleAssignment {
    roleId: string;
    assignees: string[];
}

export interface ParsedRoleAssignment {
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
    roleAssignments: ParsedRoleAssignment[];
    dates: TaskDates;
    createdDate: Date;
    modifiedDate: Date;
}

export interface TaskDates {
    created?: Date;
    due?: Date;
    completed?: Date;
    scheduled?: Date;
}

export enum TaskStatus {
    TODO = 'todo',
    IN_PROGRESS = 'in-progress',
    DONE = 'done',
    CANCELLED = 'cancelled'
}

export enum TaskPriority {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    URGENT = 'urgent'
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
    STATUS = 'status',
    ROLE = 'role',
    ASSIGNEES = 'assignees',
    DATE = 'date'
}

export interface ViewFilters {
    roles?: string[];
    people?: string[];
    companies?: string[];
    statuses?: TaskStatus[];
    priorities?: (TaskPriority | 'none-set')[];
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
    CREATED = 'created',
    DUE = 'due',
    COMPLETED = 'completed',
    SCHEDULED = 'scheduled'
}

export const TASK_DATE_ICONS: Record<keyof TaskDates, string> = {
    due: '📅',
    scheduled: '⏳',
    completed: '✅',
    created: '🗓️'
};

export interface SortOption {
    field: 'urgency' | 'description' | 'created' | 'modified' | 'due' | 'name' | 'recency';
    direction: 'asc' | 'desc';
}

// View state for organizing tasks
export interface ViewColumn {
    id: string;
    title: string;
    tasks: TaskData[];
    isUserColumn?: boolean; // For role view - indicates if this is the user's column
}

export const DEFAULT_ROLES: Role[] = [
    { id: 'drivers', name: 'Drivers', icon: '🚗', shortcut: 'd', isDefault: true, order: 1 },
    { id: 'approvers', name: 'Approvers', icon: '👍', shortcut: 'a', isDefault: true, order: 2 },
    { id: 'contributors', name: 'Contributors', icon: '👥', shortcut: 'c', isDefault: true, order: 3 },
    { id: 'informed', name: 'Informed', icon: '📢', shortcut: 'i', isDefault: true, order: 4 }
];

export const DEFAULT_SETTINGS: TaskRolesPluginSettings = {
    contactSymbol: '@',
    companySymbol: '+',
    contactDirectory: 'Contacts',
    companyDirectory: 'Companies',
    roles: DEFAULT_ROLES,
    hiddenDefaultRoles: [],
    savedViews: [],
    autoApplyFilters: true,
    useCompactFilters: false,
    useTaskQueries: false,
    debug: false,
    compatMode: false,
    compatModeUserSet: false
};

export const ROLE_ASSIGNMENT_COMMENT_START = '<!--TA-->';
export const ROLE_ASSIGNMENT_COMMENT_END = '<!--/TA-->';
