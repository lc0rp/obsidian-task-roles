declare module '../main' {
    export default class TaskRolesPlugin {
        settings: any;
        saveSettings(): Promise<void>;
    }
}
