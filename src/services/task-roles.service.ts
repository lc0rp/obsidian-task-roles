import { App, TFile, TFolder, Notice } from "obsidian";
import {
	TaskRolesPluginSettings,
	Role,
	TaskRoleAssignment,
	ParsedTaskRoleAssignment,
	ROLE_ASSIGNMENT_COMMENT_START,
	ROLE_ASSIGNMENT_COMMENT_END,
} from "../types/index.js";

export class TaskRolesService {
	private personCache: string[] = [];
	private companyCache: string[] = [];
	private cacheInitialized = false;

	constructor(private app: App, private settings: TaskRolesPluginSettings) {
		// Build initial cache and listen for file system changes
		this.refreshAssigneeCache().catch((error) =>
			console.error("Error refreshing assignee cache:", error)
		);
		this.setupCacheWatchers();
	}

	private setupCacheWatchers(): void {
		const refresh = (file: TFile) => {
			if (file.extension !== "md") return;
			const path = file.path;
			if (
				path.startsWith(`${this.settings.personDirectory}/`) ||
				path.startsWith(`${this.settings.companyDirectory}/`)
			) {
				this.refreshAssigneeCache().catch((error) =>
					console.error("Error refreshing assignee cache:", error)
				);
			}
		};

		if (typeof (this.app.vault as any).on === "function") {
			this.app.vault.on("create", refresh);
			this.app.vault.on("delete", refresh);
			this.app.vault.on("rename", refresh);
		}
	}

	async getPeopleAndCompanies(symbol: string): Promise<string[]> {
		if (!this.cacheInitialized) {
			await this.refreshAssigneeCache();
		}

		return symbol === this.settings.personSymbol
			? [...this.personCache]
			: [...this.companyCache];
	}

	getCachedPeople(): string[] {
		return [...this.personCache];
	}

	getCachedCompanies(): string[] {
		return [...this.companyCache];
	}

	async refreshAssigneeCache(): Promise<void> {
		if (
			typeof (this.app.vault as any).getAbstractFileByPath !== "function"
		) {
			this.personCache = [];
			this.companyCache = [];
			this.cacheInitialized = true;
			return;
		}

		this.personCache = this.readDirectory(this.settings.personDirectory);
		this.companyCache = this.readDirectory(this.settings.companyDirectory);
		this.cacheInitialized = true;
	}

	private readDirectory(directory: string): string[] {
		const folder = this.app.vault.getAbstractFileByPath(directory);
		if (!folder || !(folder instanceof TFolder)) {
			return [];
		}

		const files: string[] = [];
		for (const file of folder.children) {
			if (file instanceof TFile && file.extension === "md") {
				files.push(file.basename);
			}
		}

		return files.sort();
	}

	parseRoleAssignments(
		taskText: string,
		visibleRoles: Role[]
	): ParsedTaskRoleAssignment[] {
		const roleAssignments: ParsedTaskRoleAssignment[] = [];

		// First, try to parse new dataview inline format [🚗:: @John]
		const dataviewAssignedRoles = this.parseDataviewAssignedRoles(
			taskText,
			visibleRoles
		);
		roleAssignments.push(...dataviewAssignedRoles);

		// If no dataview assigned roles found, try old format (with HTML comments)
		if (roleAssignments.length === 0) {
			const legacyRoleAssignments = this.parseLegacyRoleAssignments(
				taskText,
				visibleRoles
			);
			roleAssignments.push(...legacyRoleAssignments);
		}

		return roleAssignments;
	}

	private parseDataviewAssignedRoles(
		taskText: string,
		visibleRoles: Role[]
	): ParsedTaskRoleAssignment[] {
		const roleAssignments: ParsedTaskRoleAssignment[] = [];

		// Parse dataview inline format: [🚗:: @John, @Jane]
		for (const role of visibleRoles) {
			const escapedIcon = this.escapeRegex(role.icon);
			const startPattern = `\\[${escapedIcon}::\\s*`;
			const startRegex = new RegExp(startPattern, "g");
			let startMatch;

			while ((startMatch = startRegex.exec(taskText)) !== null) {
				const startIndex = startMatch.index + startMatch[0].length;

				// Find the matching closing bracket by counting brackets
				let bracketCount = 1; // We're inside the opening bracket
				let endIndex = startIndex;

				for (let i = startIndex; i < taskText.length; i++) {
					if (taskText[i] === "[") {
						bracketCount++;
					} else if (taskText[i] === "]") {
						bracketCount--;
						if (bracketCount === 0) {
							endIndex = i;
							break;
						}
					}
				}

				if (bracketCount === 0) {
					const assigneeText = taskText
						.substring(startIndex, endIndex)
						.trim();
					const assignees = this.parseAssignees(assigneeText, true); // true for dataview format
					if (assignees.length > 0) {
						roleAssignments.push({ role, assignees });
					}
				}
			}
		}

		return roleAssignments;
	}

	private parseLegacyRoleAssignments(
		taskText: string,
		visibleRoles: Role[]
	): ParsedTaskRoleAssignment[] {
		const roleAssignments: ParsedTaskRoleAssignment[] = [];

		const sanitized = taskText
			.replace(new RegExp(ROLE_ASSIGNMENT_COMMENT_START, "g"), "")
			.replace(new RegExp(ROLE_ASSIGNMENT_COMMENT_END, "g"), "");

		const allIcons = visibleRoles
			.map((r) => this.escapeRegex(r.icon))
			.join("");
		for (const role of visibleRoles) {
			const regex = new RegExp(
				`${this.escapeRegex(
					role.icon
				)}\\s+([^${allIcons}]+?)(?=\\s*[${allIcons}]|$)`,
				"g"
			);
			const match = regex.exec(sanitized);

			if (match) {
				const assigneeText = match[1].trim();
				const assignees = this.parseAssignees(assigneeText, false); // false for legacy format
				if (assignees.length > 0) {
					roleAssignments.push({ role, assignees });
				}
			}
		}

		return roleAssignments;
	}

	private parseAssignees(
		text: string,
		isDataviewFormat: boolean = false
	): string[] {
		const assignees: string[] = [];

		if (isDataviewFormat) {
			// For dataview format, assignees can be either plain text or wiki-link format
			// Example: "@John, @Jane, +Company" or "[[People/John|@John]], [[Companies/Acme|+Acme]]"

			// First try to parse as wiki-links
			const linkRegex = /\[\[([^\]]+)\|([^\]]+)\]\]/g;
			let match;
			let hasLinks = false;

			while ((match = linkRegex.exec(text)) !== null) {
				assignees.push(match[2]); // Use the alias part (e.g., @John)
				hasLinks = true;
			}

			// If no wiki-links found, parse as plain text (backward compatibility)
			if (!hasLinks) {
				const parts = text.split(",").map((part) => part.trim());
				for (const part of parts) {
					if (
						part.startsWith(this.settings.personSymbol) ||
						part.startsWith(this.settings.companySymbol)
					) {
						assignees.push(part);
					}
				}
			}
		} else {
			// For legacy format, assignees are in wiki-link format
			// Example: "[[People/John|@John]], [[Companies/Acme|+Acme]]"
			const linkRegex = /\[\[([^\]]+)\|([^\]]+)\]\]/g;
			let match;

			while ((match = linkRegex.exec(text)) !== null) {
				assignees.push(match[2]); // Use the alias part (e.g., @John)
			}
		}

		return assignees;
	}

	formatRoleAssignments(
		roleAssignments: TaskRoleAssignment[],
		visibleRoles: Role[]
	): string {
		const parts: string[] = [];

		// Sort by role order
		const sortedRoleAssignments = roleAssignments
			.filter((a) => a.assignees.length > 0)
			.sort((a, b) => {
				const roleA = visibleRoles.find((r) => r.id === a.roleId);
				const roleB = visibleRoles.find((r) => r.id === b.roleId);
				return (roleA?.order ?? 999) - (roleB?.order ?? 999);
			});

		for (const roleAssignment of sortedRoleAssignments) {
			const role = visibleRoles.find(
				(r) => r.id === roleAssignment.roleId
			);
			if (role) {
				// Format as dataview inline with links: [🚗:: [[/path/to/person|@@person]], [[/path/to/company|+company]]]
				const assigneeList = roleAssignment.assignees
					.map((assignee) => {
						const isPerson = assignee.startsWith(
							this.settings.personSymbol
						);
						const directory = isPerson
							? this.settings.personDirectory
							: this.settings.companyDirectory;
						const cleanName = assignee.substring(1); // Remove @ or +
						return `[[${directory}/${cleanName}|${assignee}]]`;
					})
					.join(", ");
				parts.push(`[${role.icon}:: ${assigneeList}]`);
			}
		}

		return parts.join(" ");
	}

	escapeRegex(text: string): string {
		return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	}

	private findMetadataIndex(line: string): number {
		const patterns = [
			/[🔴🟡🟢]/u,
			/\[(?:urgent|high|low|in-progress|cancelled)\]/i,
			/!{1,3}/,
			/(?:recur|every)/i,
			/(due|scheduled|completed):\s*\d{4}-\d{2}-\d{2}/i,
			/📅\s*\d{4}-\d{2}-\d{2}/,
			/\[due::\s*\d{4}-\d{2}-\d{2}\]/i,
			/\[[\w\s\u{1F000}-\u{1F9FF}]+::[^\]]*\]/u, // Dataview inline fields (including emoji icons)
			/#[\w-]+/,
		];

		let index = -1;
		for (const pattern of patterns) {
			const m = line.match(pattern);
			if (m) {
				const i = m.index ?? -1;
				if (i !== -1 && (index === -1 || i < index)) {
					index = i;
				}
			}
		}
		return index;
	}

	applyRoleAssignmentsToLine(
		line: string,
		roleAssignments: TaskRoleAssignment[],
		visibleRoles: Role[]
	): string {
		const roleAssignmentsText = this.formatRoleAssignments(
			roleAssignments,
			visibleRoles
		);

		// Clean line by removing both old and new format role assignments
		let cleanLine = this.removeAllAssignedRoles(line, visibleRoles);

		if (!roleAssignmentsText) {
			return cleanLine;
		}

		// Insert assigned roles before metadata
		const idx = this.findMetadataIndex(cleanLine);
		if (idx === -1) {
			return `${cleanLine} ${roleAssignmentsText}`.trim();
		}
		const before = cleanLine.substring(0, idx).trimEnd();
		const after = cleanLine.substring(idx).trimStart();
		return `${before} ${roleAssignmentsText} ${after}`
			.replace(/\s{2,}/g, " ")
			.trim();
	}

	private removeAllAssignedRoles(line: string, visibleRoles: Role[]): string {
		let cleanLine = line;

		// Remove old format (HTML comments)
		cleanLine = cleanLine
			.replace(new RegExp(ROLE_ASSIGNMENT_COMMENT_START, "g"), "")
			.replace(new RegExp(ROLE_ASSIGNMENT_COMMENT_END, "g"), "");

		// Remove old format assigned roles (icon + wiki-links)
		const allIcons = visibleRoles
			.map((r) => this.escapeRegex(r.icon))
			.join("");
		for (const role of visibleRoles) {
			const regex = new RegExp(
				`\\s*${this.escapeRegex(role.icon)}\\s+[^${allIcons}]*`,
				"g"
			);
			cleanLine = cleanLine.replace(regex, "");
		}

		// Remove new format assigned roles (dataview inline) - handle nested brackets properly
		for (const role of visibleRoles) {
			const escapedIcon = this.escapeRegex(role.icon);
			const startPattern = `\\s*\\[${escapedIcon}::\\s*`;
			const startRegex = new RegExp(startPattern, "g");
			let startMatch;

			while ((startMatch = startRegex.exec(cleanLine)) !== null) {
				const startIndex = startMatch.index;
				const contentStartIndex =
					startMatch.index + startMatch[0].length;

				// Find the matching closing bracket by counting brackets
				let bracketCount = 1; // We're inside the opening bracket
				let endIndex = contentStartIndex;

				for (let i = contentStartIndex; i < cleanLine.length; i++) {
					if (cleanLine[i] === "[") {
						bracketCount++;
					} else if (cleanLine[i] === "]") {
						bracketCount--;
						if (bracketCount === 0) {
							endIndex = i + 1; // Include the closing bracket
							break;
						}
					}
				}

				if (bracketCount === 0) {
					// Remove the entire assigned role including brackets
					cleanLine =
						cleanLine.substring(0, startIndex) +
						cleanLine.substring(endIndex);
					// Reset the regex to start from the beginning since we modified the string
					startRegex.lastIndex = 0;
				}
			}
		}

		return cleanLine.replace(/\s{2,}/g, " ").trim();
	}

	async createMePerson(): Promise<void> {
		// Check if any case variation already exists
		if (await this.mePersonExists()) {
			new Notice("Person @me already exists");
			return;
		}

		const personPath = `${this.settings.personDirectory}/Me.md`;

		// Ensure directory exists
		const dir = this.settings.personDirectory;
		if (!(await this.app.vault.adapter.exists(dir))) {
			await this.app.vault.createFolder(dir);
		}

		await this.app.vault.create(
			personPath,
			"# Me\n\nThis is your personal file."
		);
		new Notice("Created @me person file");
		await this.refreshAssigneeCache();
	}

	async mePersonExists(): Promise<boolean> {
		const possiblePaths = [
			`${this.settings.personDirectory}/Me.md`,
			`${this.settings.personDirectory}/me.md`,
			`${this.settings.personDirectory}/ME.md`,
		];

		for (const path of possiblePaths) {
			if (await this.app.vault.adapter.exists(path)) {
				return true;
			}
		}
		return false;
	}

	async createPersonOrCompany(assignee: string): Promise<void> {
		const isPerson = assignee.startsWith(this.settings.personSymbol);
		const isCompany = assignee.startsWith(this.settings.companySymbol);

		if (!isPerson && !isCompany) {
			return;
		}

		const name = assignee.substring(1); // Remove @ or +
		const directory = isPerson
			? this.settings.personDirectory
			: this.settings.companyDirectory;
		const filePath = `${directory}/${name}.md`;

		// Check if file already exists
		if (await this.app.vault.adapter.exists(filePath)) {
			return; // File already exists, no need to create
		}

		// Ensure directory exists
		if (!(await this.app.vault.adapter.exists(directory))) {
			await this.app.vault.createFolder(directory);
		}

		// Create the file with basic content
		const fileType = isPerson ? "person" : "company";
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
