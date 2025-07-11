export class TFile { constructor() { this.extension = ''; this.basename = ''; this.stat = { ctime: 0, mtime: 0 }; } }
export class TFolder { constructor() { this.children = []; } }
export class Notice { constructor(msg) { this.msg = msg; } }
export class App { constructor() { this.vault = { getAbstractFileByPath() { }, getMarkdownFiles() { return [] }, adapter: { exists() { return false }, write() { }, read() { }, create() { }, createFolder() { }, } }; this.workspace = {}; } }
export class FuzzySuggestModal {
  constructor(app) {
    this.app = app;
    this.inputEl = {
      value: '',
      dispatched: [],
      dispatchEvent: (e) => { this.inputEl.dispatched.push(e.type); }
    };
  }
  setPlaceholder() { }
  onOpen() { }
  onNoSuggestion() { }
  close() { }
}
