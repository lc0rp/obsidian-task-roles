export var TaskStatus;
(function (TaskStatus) {
    TaskStatus["TODO"] = "todo";
    TaskStatus["IN_PROGRESS"] = "in-progress";
    TaskStatus["DONE"] = "done";
    TaskStatus["CANCELLED"] = "cancelled";
})(TaskStatus || (TaskStatus = {}));
export var TaskPriority;
(function (TaskPriority) {
    TaskPriority["LOW"] = "low";
    TaskPriority["MEDIUM"] = "medium";
    TaskPriority["HIGH"] = "high";
    TaskPriority["URGENT"] = "urgent";
})(TaskPriority || (TaskPriority = {}));
export var ViewLayout;
(function (ViewLayout) {
    ViewLayout["STATUS"] = "status";
    ViewLayout["ROLE"] = "role";
    ViewLayout["ASSIGNEES"] = "assignees";
    ViewLayout["DATE"] = "date";
})(ViewLayout || (ViewLayout = {}));
export var DateType;
(function (DateType) {
    DateType["CREATED"] = "created";
    DateType["DUE"] = "due";
    DateType["COMPLETED"] = "completed";
    DateType["SCHEDULED"] = "scheduled";
})(DateType || (DateType = {}));
export const TASK_DATE_ICONS = {
    due: '📅',
    scheduled: '⏳',
    completed: '✅',
    created: '🗓️'
};
export const DEFAULT_ROLES = [
    { id: 'drivers', name: 'Drivers', icon: '🚗', isDefault: true, order: 1 },
    { id: 'approvers', name: 'Approvers', icon: '👍', isDefault: true, order: 2 },
    { id: 'contributors', name: 'Contributors', icon: '👥', isDefault: true, order: 3 },
    { id: 'informed', name: 'Informed', icon: '📢', isDefault: true, order: 4 }
];
export const DEFAULT_SETTINGS = {
    contactSymbol: '@',
    companySymbol: '+',
    contactDirectory: 'Contacts',
    companyDirectory: 'Companies',
    roles: DEFAULT_ROLES,
    hiddenDefaultRoles: [],
    savedViews: [],
    autoApplyFilters: true,
    debug: false
};
export const ASSIGNMENT_COMMENT_START = '<!--TA-->';
export const ASSIGNMENT_COMMENT_END = '<!--/TA-->';
