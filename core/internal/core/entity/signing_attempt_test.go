package entity

import "testing"

func TestSigningAttemptStatusTerminalAndRetryEligibility(t *testing.T) {
	terminal := []SigningAttemptStatus{
		SigningAttemptStatusCompleted,
		SigningAttemptStatusDeclined,
		SigningAttemptStatusInvalidated,
		SigningAttemptStatusSuperseded,
		SigningAttemptStatusCancelled,
		SigningAttemptStatusRequiresReview,
		SigningAttemptStatusFailedPermanent,
	}
	for _, status := range terminal {
		attempt := &SigningAttempt{Status: status}
		if !attempt.IsTerminal() {
			t.Fatalf("%s should be terminal", status)
		}
		if attempt.CanRetryAutomatically() {
			t.Fatalf("%s should not be automatically retryable", status)
		}
	}

	for _, status := range []SigningAttemptStatus{SigningAttemptStatusProviderRetryWaiting, SigningAttemptStatusSubmissionUnknown, SigningAttemptStatusReconcilingProvider} {
		attempt := &SigningAttempt{Status: status}
		if attempt.IsTerminal() {
			t.Fatalf("%s should not be terminal", status)
		}
	}
}

func TestDocumentStatusProjectionFromActiveAttempt(t *testing.T) {
	cases := []struct {
		attempt SigningAttemptStatus
		expect  DocumentStatus
	}{
		{SigningAttemptStatusCreated, DocumentStatusPreparingSignature},
		{SigningAttemptStatusRendering, DocumentStatusPreparingSignature},
		{SigningAttemptStatusProviderRetryWaiting, DocumentStatusPreparingSignature},
		{SigningAttemptStatusSubmissionUnknown, DocumentStatusPreparingSignature},
		{SigningAttemptStatusSigningReady, DocumentStatusReadyToSign},
		{SigningAttemptStatusSigning, DocumentStatusSigning},
		{SigningAttemptStatusCompleted, DocumentStatusCompleted},
		{SigningAttemptStatusDeclined, DocumentStatusDeclined},
		{SigningAttemptStatusFailedPermanent, DocumentStatusError},
		{SigningAttemptStatusRequiresReview, DocumentStatusError},
	}

	for _, tc := range cases {
		if got := ProjectDocumentStatusFromAttempt(tc.attempt); got != tc.expect {
			t.Fatalf("%s projected to %s, want %s", tc.attempt, got, tc.expect)
		}
	}
}

func TestProviderErrorClassMapsToAttemptStatus(t *testing.T) {
	cases := []struct {
		class  ProviderErrorClass
		expect SigningAttemptStatus
	}{
		{ProviderErrorClassTransient, SigningAttemptStatusProviderRetryWaiting},
		{ProviderErrorClassPermanent, SigningAttemptStatusFailedPermanent},
		{ProviderErrorClassAmbiguous, SigningAttemptStatusSubmissionUnknown},
		{ProviderErrorClassConflictStale, SigningAttemptStatusRequiresReview},
	}

	for _, tc := range cases {
		if got := AttemptStatusForProviderError(tc.class); got != tc.expect {
			t.Fatalf("%s mapped to %s, want %s", tc.class, got, tc.expect)
		}
	}
}
