import { Component, Input, OnInit, Output, EventEmitter,SimpleChanges,OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { CrApiService } from '../../api/cr-api.service';
import { SessionService } from '../../session/session.service';
import { CrDetail, CrSummary, TimelineEntry } from '../../models/cr.models';
import { idle, loading, ViewState } from '../../common/view-state';
import { computeDiff, DiffRow } from '../diff.util';
import { formatMoney } from '../../common/money.util';
import { canApprovePolicy } from '../../common/permissions';

/**
 * Change Request DETAIL page: loads a CR and renders the diff/preview, the approval timeline, and
 * permission-aware Approve/Reject actions. `load`, the diff binding, and the template skeleton are
 * provided; the timeline ordering, permission gating, actions, and reject validation are yours.
 */
@Component({
	selector: 'app-cr-detail',
	standalone: true,
	imports: [CommonModule, ReactiveFormsModule],
	templateUrl: './cr-detail.component.html',
})
export class CrDetailComponent implements OnInit, OnChanges {
	@Input() id!: string;
	@Output() crUpdated = new EventEmitter<CrSummary>();

	state: ViewState<CrDetail> = idle();
	submitting = false;
	actionError?: string;
	// TODO: add validation so the form is invalid until a reason is entered.
	rejectControl = new FormControl('', {
		nonNullable: true,
		validators: [Validators.required, Validators.pattern(/\S+/)]
	});


	constructor(private readonly api: CrApiService, private readonly session: SessionService) { }

	ngOnInit(): void {
		void this.load();
	}

	ngOnChanges(changes: SimpleChanges): void {
	if (changes['id'] && !changes['id'].firstChange) {
		void this.load();
	}
}

	async load(): Promise<void> {
		this.state = loading();
		this.actionError = undefined;
		try {
			const detail = await this.api.getChangeRequest(this.session.user, this.id);
			this.state = { status: 'loaded', data: detail };
		} catch (err) {
			this.state = { status: 'error', data: null, error: (err as Error).message };
		}
	}

	get detail(): CrDetail | null {
		return this.state.data;
	}

	get diff(): DiffRow[] {
		return this.detail ? computeDiff(this.detail.baselineLineItems, this.detail.proposedLineItems) : [];
	}

	/** Approval timeline, oldest-first. */
	get timeline(): TimelineEntry[] {
		// TODO: return the audit entries ordered chronologically (oldest first).
		return [...(this.detail?.audit ?? [])]
			.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
	}

	/** Whether the current user may approve the loaded CR. */
	get canApprove(): boolean {
		// NOTE: this only looks at the CR status. The UI must also respect the user's permissions.
			return (
			!this.submitting &&
			this.detail?.status === 'PENDING_APPROVAL' &&
			canApprovePolicy(this.session.user)
		);
	}

	get canReject(): boolean {
		return (
			!this.submitting &&
			this.detail?.status === 'PENDING_APPROVAL' &&
			canApprovePolicy(this.session.user)
		);
	}

	fmt(amount: number): string {
		return this.detail ? formatMoney(amount, this.detail.currency) : String(amount);
	}

	private toSummary(detail: CrDetail): CrSummary {
		return {
			id: detail.id,
			title: detail.title,
			status: detail.status,
			orgCode: detail.orgCode,
			delta: detail.delta,
			currency: detail.currency,
			updatedAt: detail.updatedAt,
		};
	}

	async approve(): Promise<void> {
		if (!this.canApprove || !this.detail) {
			return;
		}

		this.submitting = true;
		this.actionError = undefined;

		try {
			const updated = await this.api.approve(
				this.session.user,
				this.detail.id,
				new Date().toISOString()
			);

			// Update the detail screen immediately.
			this.state = {
				status: 'loaded',
				data: updated,
			};

			// Tell the parent/list that this CR changed.
			this.crUpdated.emit(this.toSummary(updated));
		} catch (err) {
			// Keep the existing CR visible.
			this.actionError = (err as Error).message;
		} finally {
			this.submitting = false;
		}
	}

	async reject(): Promise<void> {
		if (!this.canReject || !this.detail) {
			return;
		}

		this.rejectControl.markAsTouched();

		const reason = this.rejectControl.value.trim();

		if (!reason) {
			this.rejectControl.setErrors({
				required: true,
			});
			return;
		}

		this.submitting = true;
		this.actionError = undefined;

		try {
			const updated = await this.api.reject(
				this.session.user,
				this.detail.id,
				new Date().toISOString(),
				reason
			);

			// Update the detail screen immediately.
			this.state = {
				status: 'loaded',
				data: updated,
			};

			// Tell the parent/list that this CR changed.
			this.crUpdated.emit(this.toSummary(updated));

			// Clear the rejection reason after success.
			this.rejectControl.reset();
		} catch (err) {
			// Keep the existing CR visible.
			this.actionError = (err as Error).message;
		} finally {
			this.submitting = false;
		}
	}
}
