import { TaskStatus } from '../../types';
import { MultiSelectFilterBase, Option } from './multi-select-filter-base';

export class StatusFilter extends MultiSelectFilterBase<TaskStatus> {
	// Uses the shared base render.
	render(container: HTMLElement): void {
		super.render(container, 'check-circle');
	}

	protected getOptions(): Option<TaskStatus>[] {
		return [
			{ value: TaskStatus.TODO, label: 'To Do' },
			{ value: TaskStatus.IN_PROGRESS, label: 'In Progress' },
			{ value: TaskStatus.DONE, label: 'Done' },
			{ value: TaskStatus.CANCELLED, label: 'Cancelled' }
		];
	}

	protected updateDisplayText(button: HTMLElement): void {
		const options = this.getOptions();
		const total = options.length;
		const selected = this.currentValues.length;
		button.setText(selected === 0 || selected === total ? 'All Statuses' : `${selected} of ${total} Statuses`);
	}
}