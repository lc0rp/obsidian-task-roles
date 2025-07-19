import { MultiSelectFilterBase, Option } from './multi-select-filter-base';

export class RolesFilter extends MultiSelectFilterBase<string> {
	render(container: HTMLElement): void {
		// Use the same CSS classes as for status filter in compact-filters.ts
		super.render(container, 'axe');
	}

	protected getOptions(): Option<string>[] {
		// Prepend the "None Set" option, then add visible roles.
		const noneOption: Option<string> = { value: 'none-set', label: 'None Set' };
		// Retrieve visible roles from the plugin.
		const visibleRoles = this.plugin.getVisibleRoles();
		const roleOptions = visibleRoles.map(role => ({ value: role.id, label: role.name, icon: role.icon }));
		return [noneOption, ...roleOptions];
	}

	protected updateDisplayText(button: HTMLElement): void {
		const options = this.getOptions();
		// Total count is just the options (which include "None Set")
		const total = options.length;
		const selected = this.currentValues.length;
		button.setText(selected === 0 || selected === total ? 'All Roles' : `${selected} of ${total} Roles`);
	}
}