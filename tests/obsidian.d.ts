declare module 'obsidian' {
  export class TAbstractFile { path: string; }
  export class TFile extends TAbstractFile { extension: string; basename: string; stat: { ctime: number; mtime: number }; }
  export class TFolder extends TAbstractFile { children: TAbstractFile[]; }
  export class App { vault: any; workspace: any; }
  export class Notice { constructor(message: string, timeout?: number); }
  export class FuzzySuggestModal<T> {
    app: App;
    inputEl: { value: string; dispatchEvent(e: Event): void };
    constructor(app: App);
    setPlaceholder(text: string): void;
    onOpen(): void;
    onNoSuggestion(): void;
    close(): void;
  }
}
