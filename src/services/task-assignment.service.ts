import { App, TFile, TFolder, Notice } from 'obsidian';
import { TaskAssignmentSettings, Role, Assignment, ParsedAssignment } from '../types';

export class TaskAssignmentService {
	private contactCache: string[] = [];
	private companyCache: string[] = [];
	private cacheInitialized = false;

	constructor(private app: App, private settings: TaskAssignmentSettings) {
		// Build initial cache and listen for file system changes
		void this.refreshAssigneeCache();
		this.setupCacheWatchers();
	}

	private setupCacheWatchers(): void {
		const refresh = (file: TFile) => {
			if (file.extension !== 'md') return;
			const path = file.path;
			if (path.startsWith(`${this.settings.contactDirectory}/`) ||
				path.startsWith(`${this.settings.companyDirectory}/`)) {
				void this.refreshAssigneeCache();
			}
		};

		if (typeof (this.app.vault as any).on === 'function') {
			this.app.vault.on('create', refresh);
			this.app.vault.on('delete', refresh);
			this.app.vault.on('rename', refresh);
		}
	}

	async getContactsAndCompanies(symbol: string): Promise<string[]> {
		if (!this.cacheInitialized) {
			await this.refreshAssigneeCache();
		}

		return symbol === this.settings.contactSymbol
			? [...this.contactCache]
			: [...this.companyCache];
	}

	getCachedContacts(): string[] {
		return [...this.contactCache];
	}

	getCachedCompanies(): string[] {
		return [...this.companyCache];
	}

	async refreshAssigneeCache(): Promise<void> {
		if (typeof (this.app.vault as any).getAbstractFileByPath !== 'function') {
			this.contactCache = [];
			this.companyCache = [];
			this.cacheInitialized = true;
			return;
		}

		this.contactCache = await this.readDirectory(this.settings.contactDirectory);
		this.companyCache = await this.readDirectory(this.settings.companyDirectory);
		this.cacheInitialized = true;
	}

	private async readDirectory(directory: string): Promise<string[]> {
		const folder = this.app.vault.getAbstractFileByPath(directory);
		if (!folder || !(folder instanceof TFolder)) {
			return [];
		}

		const files: string[] = [];
		for (const file of folder.children) {
			if (file instanceof TFile && file.extension === 'md') {
				files.push(file.basename);
			}
		}

		return files.sort();
	}

	parseTaskAssignments(taskText: string, visibleRoles: Role[]): ParsedAssignment[] {
		const assignments: ParsedAssignment[] = [];

		const allIcons = visibleRoles.map(r => this.escapeRegex(r.icon)).join('');
		for (const role of visibleRoles) {
			const regex = new RegExp(`${this.escapeRegex(role.icon)}\\s+([^${allIcons}]+?)(?=\\s*[${allIcons}]|$)`, 'g');
			const match = regex.exec(taskText);

			if (match) {
				const assigneeText = match[1].trim();
				const assignees = this.parseAssignees(assigneeText);
				if (assignees.length > 0) {
					assignments.push({ role, assignees });
				}
			}
		}

		return assignments;
	}

	private parseAssignees(text: string): string[] {
		const linkRegex = /\[\[([^\]]+)\|([^\]]+)\]\]/g;
		const assignees: string[] = [];
		let match;

		while ((match = linkRegex.exec(text)) !== null) {
			assignees.push(match[2]); // Use the alias part (e.g., @John)
		}

		return assignees;
	}

	formatAssignments(assignments: Assignment[], visibleRoles: Role[]): string {
		const parts: string[] = [];

		// Sort by role order
		const sortedAssignments = assignments
			.filter(a => a.assignees.length > 0)
			.sort((a, b) => {
				const roleA = visibleRoles.find(r => r.id === a.roleId);
				const roleB = visibleRoles.find(r => r.id === b.roleId);
				return (roleA?.order || 999) - (roleB?.order || 999);
			});

		for (const assignment of sortedAssignments) {
			const role = visibleRoles.find(r => r.id === assignment.roleId);
			if (role) {
				const formattedAssignees = assignment.assignees.map(assignee => {
					const isContact = assignee.startsWith(this.settings.contactSymbol);
					const directory = isContact ? this.settings.contactDirectory : this.settings.companyDirectory;
					const cleanName = assignee.substring(1); // Remove @ or +
					return `[[${directory}/${cleanName}|${assignee}]]`;
				}).join(', ');

				parts.push(`${role.icon} ${formattedAssignees}`);
			}
		}

		return parts.join(' ');
	}

	escapeRegex(text: string): string {
		return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}

	async createMeContact(): Promise<void> {
		const contactPath = `${this.settings.contactDirectory}/Me.md`;

		if (await this.app.vault.adapter.exists(contactPath)) {
			new Notice('Contact @me already exists');
			return;
		}

		// Ensure directory exists
		const dir = this.settings.contactDirectory;
		if (!await this.app.vault.adapter.exists(dir)) {
			await this.app.vault.createFolder(dir);
		}

		await this.app.vault.create(contactPath, '# Me\n\nThis is your personal contact file.');
		new Notice('Created @me contact');
		await this.refreshAssigneeCache();
	}

	async createContactOrCompany(assignee: string): Promise<void> {
		const isContact = assignee.startsWith(this.settings.contactSymbol);
		const isCompany = assignee.startsWith(this.settings.companySymbol);

		if (!isContact && !isCompany) {
			return;
		}

		const name = assignee.substring(1); // Remove @ or +
		const directory = isContact ? this.settings.contactDirectory : this.settings.companyDirectory;
		const filePath = `${directory}/${name}.md`;

		// Check if file already exists
		if (await this.app.vault.adapter.exists(filePath)) {
			return; // File already exists, no need to create
		}

		// Ensure directory exists
		if (!await this.app.vault.adapter.exists(directory)) {
			await this.app.vault.createFolder(directory);
		}

		// Create the file with basic content
		const fileType = isContact ? 'contact' : 'company';
		const content = `# ${name}\n\nThis is a ${fileType} file.`;

		try {
			await this.app.vault.create(filePath, content);
			new Notice(`Created ${fileType}: ${assignee}`, 2000);
			await this.refreshAssigneeCache();
		} catch (error) {
			console.error(`Error creating ${fileType} file:`, error);
			new Notice(`Failed to create ${fileType}: ${assignee}`, 3000);
		}
	}
}
