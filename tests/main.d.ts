declare module '../main' {
  export default class TaskAssignmentPlugin {
    settings: any;
    saveSettings(): Promise<void>;
  }
}
