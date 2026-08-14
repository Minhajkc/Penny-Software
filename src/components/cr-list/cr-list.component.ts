import { Component, EventEmitter, OnInit, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CrApiService } from '../../api/cr-api.service';
import { SessionService } from '../../session/session.service';
import { CrStatus, CrSummary } from '../../models/cr.models';
import { idle, loading, ViewState } from '../../common/view-state';

/**
 * Change Request LIST page. Loads the caller's CRs and renders loading / loaded / empty / error
 * states, plus a status filter. The load + state handling are provided as the pattern; the status
 * filter (`visibleRows`) is yours to complete.
 */
@Component({
	selector: 'app-cr-list',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './cr-list.component.html',
})
export class CrListComponent implements OnInit {
	@Output() select = new EventEmitter<string>();

	

		/**
	 * Updated CR received from the parent after an
	 * approve/reject action.
	 */
	@Input()
	set updatedCr(value: CrSummary | null) {
		if (value) {
			this.updateRow(value);
		}
	}

	state: ViewState<CrSummary[]> = idle();
	statusFilter: CrStatus | 'ALL' = 'ALL';
	readonly statuses: (CrStatus | 'ALL')[] = [
		'ALL',
		'DRAFT',
		'SUBMITTED',
		'PENDING_APPROVAL',
		'APPROVED',
		'APPLIED',
		'REJECTED',
		'CANCELLED',
	];

	constructor(private readonly api: CrApiService, private readonly session: SessionService) { }

	ngOnInit(): void {
		void this.load();
	}

	async load(): Promise<void> {
		this.state = loading();
		try {
			const rows = await this.api.listChangeRequests(this.session.user);
			this.state = { status: rows.length ? 'loaded' : 'empty', data: rows };
			if (!rows.length) {
				this.select.emit(null);
			}
		} catch (err) {
			this.state = { status: 'error', data: null, error: (err as Error).message };
			this.select.emit(null);
		}
		
	}

	onFilterChange(value: string): void {
		this.statusFilter = value as CrStatus | 'ALL';
			this.ensureSelectionIsVisible();
	}

	private ensureSelectionIsVisible(): void {
		const rows = this.visibleRows;
		if (rows.length === 0) {
			this.select.emit(null);
		}
	}

	private updateRow(updatedCr: CrSummary): void {
		const rows = this.state.data;

		// List may not have loaded yet.
		if (!rows) {
			return;
		}

		const index = rows.findIndex(
			(row) => row.id === updatedCr.id
		);

		// CR is not present in the current user's list.
		if (index === -1) {
			return;
		}

		const updatedRows = [...rows];

		updatedRows[index] = updatedCr;

		this.state = {
			status: 'loaded',
			data: updatedRows,
		};
	}

	/** Rows to render, after applying the active status filter. */
	get visibleRows(): CrSummary[] {
		const rows = this.state.data ?? [];
		// TODO: narrow `rows` by `this.statusFilter` ('ALL' shows everything).
		if (this.statusFilter === 'ALL') {
			return rows;
		}

		return rows.filter(row => row.status === this.statusFilter);
	}
}
