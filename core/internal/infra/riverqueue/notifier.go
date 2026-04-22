package riverqueue

// Completion dispatch is now attempt-scoped and handled by DispatchAttemptCompletion.
// The legacy document-level notifier was intentionally removed so document status
// updates cannot enqueue completion jobs without proving the completed attempt is
// still active.
