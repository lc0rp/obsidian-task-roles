import { setIcon } from 'obsidian';
import { TaskPriority } from '../../types';
import { MultiSelectFilterBase, Option } from './multi-select-filter-base';

export class PriorityFilter extends MultiSelectFilterBase<TaskPriority> {
	render(container: HTMLElement): void {
		super.render(container, 'flag');
	}

	protected getOptions(): Option<TaskPriority>[] {
		return [
			{ value: TaskPriority.HIGHEST, label: 'Urgent' },
			{ value: TaskPriority.HIGH, label: 'High' },
			{ value: TaskPriority.MEDIUM, label: 'Medium' },
			{ value: TaskPriority.NONE, label: 'Normal' },
			{ value: TaskPriority.LOW, label: 'Low' },
			{ value: TaskPriority.LOWEST, label: 'Lowest' }
		];
	}

	protected updateDisplayText(button: HTMLElement): void {
		const options = this.getOptions();
		const total = options.length;
		const selected = this.currentValues.length;
		button.setText(selected === 0 || selected === total ? 'All Priorities' : `${selected} of ${total} Priorities`);
	}
}