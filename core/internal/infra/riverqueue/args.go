package riverqueue

import (
	"time"

	"github.com/riverqueue/river"
)

// AttemptJobArgs carries attempt-scoped signing work. River jobs are keyed by
// attempt + phase so regeneration never deduplicates work across attempts.
type AttemptJobArgs struct {
	AttemptID string `json:"attempt_id"`
}

type RenderAttemptPDFArgs AttemptJobArgs

type SubmitAttemptToProviderArgs AttemptJobArgs

type ReconcileProviderSubmissionArgs AttemptJobArgs

type RefreshAttemptProviderStatusArgs AttemptJobArgs

type CleanupProviderAttemptArgs AttemptJobArgs

type DispatchAttemptCompletionArgs AttemptJobArgs

func (RenderAttemptPDFArgs) Kind() string             { return "render_attempt_pdf" }
func (SubmitAttemptToProviderArgs) Kind() string      { return "submit_attempt_to_provider" }
func (ReconcileProviderSubmissionArgs) Kind() string  { return "reconcile_provider_submission" }
func (RefreshAttemptProviderStatusArgs) Kind() string { return "refresh_attempt_provider_status" }
func (CleanupProviderAttemptArgs) Kind() string       { return "cleanup_provider_attempt" }
func (DispatchAttemptCompletionArgs) Kind() string    { return "dispatch_attempt_completion" }

func (a RenderAttemptPDFArgs) InsertOpts() river.InsertOpts        { return uniqueAttemptPhaseOpts() }
func (a SubmitAttemptToProviderArgs) InsertOpts() river.InsertOpts { return uniqueAttemptPhaseOpts() }
func (a ReconcileProviderSubmissionArgs) InsertOpts() river.InsertOpts {
	return uniqueAttemptPhaseOpts()
}
func (a RefreshAttemptProviderStatusArgs) InsertOpts() river.InsertOpts {
	return uniqueAttemptPhaseOpts()
}
func (a CleanupProviderAttemptArgs) InsertOpts() river.InsertOpts    { return uniqueAttemptPhaseOpts() }
func (a DispatchAttemptCompletionArgs) InsertOpts() river.InsertOpts { return uniqueAttemptPhaseOpts() }

func uniqueAttemptPhaseOpts() river.InsertOpts {
	return river.InsertOpts{UniqueOpts: river.UniqueOpts{ByArgs: true, ByPeriod: 24 * time.Hour}}
}
