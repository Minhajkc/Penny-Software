# Implementation Notes

## 1. What I changed

* Fixed the diff classification issue where a quantity-only change was incorrectly treated as unchanged.
* Updated the diff logic to detect changes in quantity, unit price, and description.
* Fixed the detail-page permission issue so Approve/Reject are only available when the Change Request is in the correct status and the current user has the required permission.
* Implemented the Change Request status filter in the list.
* Updated `visibleRows` so the table displays only rows matching the selected status.
* Implemented loading, empty, and error handling in the Change Request list.
* Added retry handling for list loading failures.
* Implemented detail-page loading and error handling.
* Fixed the detail state so previously loaded data is not shown while loading a different Change Request or when there is no detail data available.
* Implemented chronological ordering for the approval timeline.
* Implemented Approve and Reject actions using the provided API.
* Added protection against duplicate actions while an action is already being submitted.
* Added rejection-reason validation so Reject cannot be submitted without a valid reason.
* Added handling for failed Approve/Reject API calls so the action state is reset correctly.

## 2. Component & state model

* `CrListComponent` loads Change Requests from the provided API and manages the list state.

* The list supports loading, loaded, empty, and error states.

* The selected status is used to calculate `visibleRows`, which is what the table renders.

* Selecting a Change Request sends its ID to the detail view.

* When there are no applicable rows, the selection is cleared so an old Change Request is not kept in the detail view.

* `CrDetailComponent` loads the selected Change Request and exposes the current detail state to the template.

* The detail view resets its state while loading new data so previously fetched detail data is not displayed as if it belonged to the new selection.

* The component calculates the Change Request diff and displays the totals and delta.

* Approval timeline entries are sorted chronologically before being displayed.

* Approve and Reject availability is controlled by both the Change Request status and the current user's permission.

* During an action, the component uses a submitting state to prevent duplicate requests.

* Reject uses a form control with validation for the rejection reason.

## 3. Invariants I keep

| Invariant                                                            | How / where                                                           |
| -------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Quantity-only changes are detected                                   | `computeDiff()` compares quantity between baseline and proposed items |
| Price/description changes are detected                               | `computeDiff()` compares unit price and description                   |
| Filtered rows are the only rows rendered                             | `CrListComponent.visibleRows`                                         |
| Previous detail data is not displayed while a new detail is loading  | Detail state is reset before loading new data                         |
| Approve requires the correct CR status and permission                | `canApprove` permission/status check                                  |
| Reject requires the correct CR status and permission                 | `canReject` permission/status check                                   |
| Reject requires a reason                                             | Reactive form validation and whitespace validation                    |
| Duplicate actions are prevented                                      | `submitting` state disables the action while the request is running   |
| Timeline is displayed chronologically                                | Timeline entries are sorted by their timestamp                        |
| API failures do not leave the action permanently in submitting state | Action error handling resets `submitting`                             |

## 4. Testing strategy

* Used component/DOM tests for the Change Request list and detail behavior.
* Tested the diff logic separately for change classification.
* Added/updated tests around:

  * Change Request list rendering
  * empty state
  * diff behavior
  * permission gating for Approve
* The tests focus on the behavior required by the assessment rather than testing Angular framework internals.

## 5. Assumptions

* Approve and Reject are only valid for Change Requests in the pending approval state.
* The user's permission strings from `SessionService` are used to determine whether approval actions are allowed.
* A rejection reason must contain non-whitespace text.
* The provided mock API and existing project structure are treated as the source of truth.
* Timeline entries should be displayed in chronological order.

## 6. Where I used AI

* I used AI during development to help understand the existing Angular assessment code, debug test failures, reason about state handling and permissions, and review implementation approaches.
* I reviewed and adapted the suggestions to the existing project structure and implemented the final changes myself.

## 7. What I'd improve with more time

* Add more tests for status filtering and list error states.
* Add modern ui and ux
* Add more tests for Approve/Reject success and failure scenarios.
* Add more tests for rejection validation and timeline ordering.
* Add additional tests around switching between Change Requests and preventing stale detail data.
