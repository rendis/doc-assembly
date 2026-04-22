# Signing Attempts and River-Orchestrated Signing Flow Design

Date: 2026-04-22
Status: Hardened draft for implementation planning
Scope: `doc-assembly` signing engine and public/authenticated signing flows

## 0. Reader orientation

This document is intended to be understandable by a new agent or developer without access to the conversation that produced it.

The project has three relevant layers:

```text
doc-assembly        = provider-agnostic engine/library for rendering and signing flows
tools-doc-assembly  = deployable service that configures/extends doc-assembly
contracts           = templates and contract inputs
```

This spec belongs primarily to `doc-assembly` because it changes the engine-level signing architecture. `tools-doc-assembly` will consume the resulting engine behavior and provide deployable configuration, provider credentials, storage configuration, and domain-specific injectors/mappers.

### Current problem background

The existing signing flow is document-centric. The logical document row stores signing-side effects such as PDF path, provider document ID, provider status, retry metadata, and recipient provider references. That model worked for a simple path, but it becomes unsafe when the flow partially succeeds.

The concrete failure patterns that motivated this redesign are:

1. **PDF stored but provider upload failed**
   - The PDF exists in storage.
   - The provider does not yet have a signing document.
   - Retrying must continue from the stored PDF, not rerender the document.

2. **Provider upload outcome is unknown**
   - The provider request may have created an envelope/document.
   - The local service did not receive a definitive response because of timeout, crash, or connection loss.
   - Retrying blindly can create duplicate provider documents.

3. **Wrong data requires a regenerated PDF**
   - A new PDF must be produced.
   - Existing provider signing URLs and provider recipient IDs must not be reused.
   - The stable `documentId` remains the logical contract/process identifier.

4. **Old jobs or webhooks can arrive late**
   - A retry job or provider webhook may target an older signing execution.
   - Late events must not mutate the current active signing flow.

5. **The current retry path can mix responsibilities**
   - Retry, regeneration, provider reconciliation, and provider cleanup are different processes.
   - They need separate states and rules.

### Decision summary

The decision is to split the signing model:

```text
Document        = stable logical contract/process and business projection
SigningAttempt  = one concrete render + provider submission + signing execution
River           = durable execution engine for asynchronous signing steps
```

The document ID remains stable for external callers. Every concrete PDF/provider submission lives under a signing attempt. Retry continues the same attempt. Regeneration invalidates or supersedes the current attempt and creates a new one. Completed document corrections create a new logical correction document.

### Clean-slate implementation stance

This redesign is a clean replacement, not a compatibility layer.

The product has no active production users. Therefore the implementation must optimize for the correct durable architecture instead of preserving the current document-centric signing behavior. There must be no dual-read, no dual-write, no legacy fallback, no compatibility shim, and no provider-upload scheduler kept alive as an alternate path.

The implementation must choose the single target architecture described in this spec:

```text
Document projection + SigningAttempt source of truth + River-orchestrated side effects
```

Any old field, status, job, or service path that contradicts that model must be removed, replaced, or reduced to a derived projection in the same implementation line. Leaving legacy signing state as an authoritative fallback is out of scope.

### How to use this spec

A new session must treat this document as the source of truth for the redesign. Before implementation, also inspect:

- `docs/proceed-to-signing-concurrency.md` for the current race condition and old CAS-based mitigation.
- `docs/backend/public-signing-flow.md` for the current public/authenticated signing flows.
- `internal/infra/riverqueue/` for the existing River integration pattern.

Those files explain the current implementation. This spec defines the target implementation.

## 1. Purpose

This spec defines the target signing architecture for `doc-assembly` before the product has active production users. The design intentionally does **not** preserve backward compatibility with the current document-centric signing state machine. The goal is to make the signing flow correct, observable, retryable, and safe under partial failures.

The current model stores too many signing-side effects directly on the logical document. That makes these cases ambiguous:

- PDF was generated and stored, but provider upload failed.
- Provider upload may have succeeded, but our request timed out.
- A document must be regenerated because input data was wrong.
- An old webhook or job arrives after a newer signing flow is already active.
- A retry worker reruns a step that must not be rerun blindly.

The target model separates the stable business object from each technical execution of the signing flow.

```text
Document        = stable logical contract/process
SigningAttempt  = one concrete render + provider submission + signature execution
River           = durable execution engine for asynchronous steps
```

## 2. Non-goals

This spec does not aim to:

- Keep current production data backward compatible.
- Support dual-read from old and new signing fields.
- Preserve old provider IDs, signing URLs, or pending public tokens.
- Preserve the old schema shape, old document-centric signing fields, or old status semantics.
- Implement provider-specific API details.
- Replace River with a custom scheduler or in-process polling loop.

Existing signing-related data will be treated as disposable for this redesign. Implementation is allowed to reset, destructively migrate, or regenerate that data because the product has not yet been adopted by real users.

## 3. Definitions

### 3.1 Document

A `Document` is the stable logical contract that external systems, the CRM, and the frontend refer to. Its ID remains stable across render attempts and provider submissions.

A document owns the business identity and high-level status only. It must not be the durable owner of provider-specific side effects.

A document has exactly one active signing attempt at a time, or no active attempt if signing has not started.

### 3.2 SigningAttempt

A `SigningAttempt` is one concrete execution of the signing process for a document.

An attempt owns:

- generated PDF artifact reference;
- PDF checksum/fingerprint;
- render metadata;
- field/signature snapshot;
- provider submission metadata;
- provider document/envelope ID;
- provider recipient IDs;
- retry metadata;
- terminal status for that execution;
- invalidation/supersession reason.

Attempts are append-only from a business perspective. A completed, invalidated, superseded, or permanently failed attempt must not be reused as an active signing execution.

### 3.3 Active attempt

The active attempt is the attempt currently allowed to drive the document's visible signing state.

Only the active attempt is allowed to:

- produce signing responses for current signers;
- update the document projection;
- accept provider webhook updates that affect the document projection;
- be retried by active provider submission jobs.

Historical attempts remain auditable but cannot mutate the document projection.

### 3.4 Document projection

The document's signing status is a projection of the active attempt. It exists for API ergonomics and business queries, not as an independent source of truth.

If the document projection and the active attempt disagree, the active attempt wins and the projection must be corrected.

### 3.5 Provider boundary

The provider boundary is any side effect performed against a signing provider such as Documenso.

Provider operations are not part of the local PostgreSQL transaction. Therefore, River can reliably execute jobs, but the domain must still handle duplicate execution, ambiguous outcomes, and reconciliation.

### 3.6 Retry vs regeneration

Retry and regeneration are different operations.

```text
Retry        = continue the same attempt after a transient failure.
Regeneration = invalidate/supersede the current attempt and create a new attempt.
```

Retry must not create a new attempt. Regeneration must not reuse provider IDs or signing URLs from the previous attempt.

## 4. Core design principles

1. `document.id` is stable.
2. `signing_attempt.id` is the unit of technical execution and audit.
3. Exactly one signing attempt must be active per document once signing preparation starts.
4. Generated PDFs are immutable per attempt.
5. Retry resumes from persisted attempt checkpoints.
6. Retry does not rerender Typst unless the attempt has not produced a valid PDF artifact.
7. Regeneration creates a new attempt.
8. Provider cleanup during regeneration is best-effort and must not block creation of a new attempt.
9. River is the only durable execution mechanism for asynchronous signing steps.
10. Workers must be idempotent and safe to execute more than once.
11. Webhooks must be correlated to attempts and must not update a document through an invalidated attempt.
12. Ambiguous provider outcomes must enter an explicit reconciliation state; they must not be retried blindly.

## 5. Ownership boundaries

### 5.1 Document owns

- business identity;
- workspace/template/document type references;
- business title/external reference;
- active attempt pointer;
- high-level projected status;
- creation/completion summary;
- supersession/cancellation summary if the logical document itself is invalidated.

### 5.2 SigningAttempt owns

- attempt sequence number;
- technical signing status;
- render status;
- PDF storage path;
- PDF checksum;
- signature field snapshot;
- provider upload payload snapshot;
- provider name;
- provider document/envelope ID;
- provider submission correlation key;
- retry count;
- next retry time;
- last error classification;
- processing lease;
- invalidation/supersession reason;
- timestamps for render, storage, submission, active signing, completion, invalidation.

### 5.3 Attempt recipients own

Provider-recipient state belongs to the attempt, not only to the document.

The attempt recipient record owns:

- attempt ID;
- logical recipient reference or snapshot;
- role ID used in that attempt;
- email/name snapshot used for provider submission;
- provider recipient ID;
- provider signing token/reference when the provider returns one;
- signing URL if stored at all;
- recipient status for that attempt;
- signed timestamp for that attempt.

A recipient signature on an invalidated attempt does not count as a signature on the active attempt.

### 5.4 Required data model contract

The implementation must introduce a clean attempt-owned schema. Exact SQL names may follow repository conventions, but the following logical contract is mandatory.

#### Documents

`execution.documents` remains the stable business object and projection. It must contain:

- `id` as the stable logical document ID;
- business references such as workspace, template version, document type, title, external reference, transactional ID, and related document link;
- `active_attempt_id` nullable, pointing to the current attempt for this document;
- business/projected status only;
- completed/cancellation/correction summary fields if needed by API ergonomics;
- audit timestamps.

`execution.documents` must not be the durable owner of provider-side execution state. The following document-level concepts must be removed as source-of-truth signing state:

- provider document/envelope ID;
- provider name for the active execution;
- pre-signing PDF storage path;
- provider retry count / next retry / last retry;
- provider recipient IDs;
- signing URLs.

If an API still needs any of those values, it must read them from the active attempt or from attempt recipients and expose them as a projection.

#### Signing attempts

`execution.signing_attempts` must contain, at minimum:

- `id`;
- `document_id`;
- monotonically increasing `sequence` per document;
- `status` using the attempt status model in this spec;
- render status/timestamps;
- immutable PDF storage path;
- PDF checksum/fingerprint and checksum algorithm;
- render metadata;
- signature field snapshot;
- provider upload payload snapshot;
- provider name;
- provider correlation key;
- provider document/envelope ID, when known;
- provider submit phase, when a provider operation is in progress or failed;
- retry count / next retry / last error class;
- reconciliation count / next reconciliation time;
- cleanup status/action/error metadata;
- processing lease owner and lease expiration;
- invalidation/supersession reason;
- created/updated/terminal timestamps.

#### Attempt recipients

`execution.signing_attempt_recipients` must contain, at minimum:

- `id`;
- `attempt_id`;
- logical `document_recipient_id` when a logical recipient exists;
- role ID used for this attempt;
- signer order used for this attempt;
- email/name snapshot used for provider submission;
- provider recipient ID;
- provider signing token/reference if returned by the provider;
- signing URL if the system stores one;
- recipient status for this attempt;
- signed timestamp for this attempt;
- created/updated timestamps.

`execution.document_recipients` remains the logical recipient definition for the document. Attempt recipients are the provider-execution snapshot. Recipient provider IDs and signing URLs must not be written back to `document_recipients` as authoritative state.

#### Attempt events

`execution.signing_attempt_events` must record attempt-local history and provider events. It must support:

- transition events;
- worker events;
- provider webhook events;
- historical events for superseded attempts;
- raw provider payload storage or a pointer to raw payload storage;
- metadata including error class, River job ID, provider document ID, and correlation key.

Document-level events may remain as business/audit projections, but attempt events are the authoritative execution history.

#### Required constraints and indexes

The database must enforce the model instead of relying only on service checks:

1. `documents.active_attempt_id` must reference an attempt for the same document. If PostgreSQL cannot enforce the same-document condition with a simple FK, enforce it with a transactionally safe constraint trigger or repository-level locked update plus tests.
2. Attempt sequence must be unique per document: `(document_id, sequence)`.
3. Provider document identity must be unique when known: `(provider_name, provider_document_id)` where `provider_document_id IS NOT NULL`.
4. Provider correlation key must be unique per provider when known: `(provider_name, provider_correlation_key)`.
5. Attempt recipients must be unique per attempt and logical role/recipient as appropriate.
6. Cleanup/reconciliation lookup indexes must exist for status + next retry/reconciliation timestamps.
7. River job uniqueness must be attempt-and-phase scoped; no signing attempt job may be deduplicated only by `document_id`.

Because there is no production compatibility requirement, destructive schema changes are allowed and preferred over legacy-preserving migrations when they produce a simpler final model.

## 6. Status model

### 6.1 Document statuses

Document statuses must be few and business-oriented.

```text
DRAFT
AWAITING_INPUT
PREPARING_SIGNATURE
READY_TO_SIGN
SIGNING
COMPLETED
DECLINED
CANCELLED
INVALIDATED
ERROR
```

Definitions:

- `DRAFT`: document exists but is not ready for signing.
- `AWAITING_INPUT`: document requires signer/user input before PDF generation.
- `PREPARING_SIGNATURE`: an active attempt is rendering, storing, submitting, retrying, or reconciling.
- `READY_TO_SIGN`: provider submission is complete and current signer can open signing UI.
- `SIGNING`: at least one recipient has started or the provider document is waiting for signatures.
- `COMPLETED`: active attempt completed successfully.
- `DECLINED`: active attempt was declined.
- `CANCELLED`: logical document was cancelled by an authorized actor.
- `INVALIDATED`: logical document is no longer valid as a business object.
- `ERROR`: active attempt reached a permanent failure that requires manual or explicit corrective action.

The document status is derived from the active attempt status except for logical document cancellation/invalidation.

### 6.2 SigningAttempt statuses

Attempt statuses are technical and precise.

```text
CREATED
RENDERING
PDF_READY
READY_TO_SUBMIT
SUBMITTING_PROVIDER
PROVIDER_RETRY_WAITING
SUBMISSION_UNKNOWN
RECONCILING_PROVIDER
SIGNING_READY
SIGNING
COMPLETED
DECLINED
INVALIDATED
SUPERSEDED
CANCELLED
REQUIRES_REVIEW
FAILED_PERMANENT
```

Definitions:

- `CREATED`: attempt exists but no side effect has started.
- `RENDERING`: Typst/render operation is in progress.
- `PDF_READY`: PDF is generated and durably stored with checksum.
- `READY_TO_SUBMIT`: attempt has everything needed for provider submission.
- `SUBMITTING_PROVIDER`: provider submission worker owns the current submit operation.
- `PROVIDER_RETRY_WAITING`: provider submission failed with a retryable error and is waiting for scheduled retry.
- `SUBMISSION_UNKNOWN`: provider submission outcome is ambiguous; the system must reconcile before resubmitting.
- `RECONCILING_PROVIDER`: reconciliation worker is checking whether provider state already exists.
- `SIGNING_READY`: provider accepted the document and signing references are available.
- `SIGNING`: provider reports active signature progress.
- `COMPLETED`: all required signatures for this attempt are complete.
- `DECLINED`: provider or signer declined this attempt.
- `INVALIDATED`: attempt was manually invalidated and must no longer affect the document.
- `SUPERSEDED`: attempt was replaced by a newer attempt for the same document.
- `CANCELLED`: attempt was explicitly cancelled/voided.
- `REQUIRES_REVIEW`: automatic processing cannot safely continue, but an operator or explicit corrective action may recover by regenerating or resolving provider state.
- `FAILED_PERMANENT`: unrecoverable attempt failure.

### 6.3 Terminal attempt statuses

The following are terminal:

```text
COMPLETED
DECLINED
INVALIDATED
SUPERSEDED
CANCELLED
REQUIRES_REVIEW
FAILED_PERMANENT
```

Terminal attempts must not be retried automatically.

### 6.4 Active attempt eligibility

An attempt is eligible to be active only if it is not terminal.

An attempt in `COMPLETED` remains the active attempt only while the document is completed. No retry or regeneration job may operate on it.

## 7. River usage

### 7.1 River is mandatory for async signing side effects

The target flow must use River for asynchronous signing work. The old polling scheduler pattern must not remain the primary mechanism for provider submission or retry.

River jobs must be used for:

- render PDF;
- upload/store PDF if split from render;
- submit to provider;
- reconcile provider submission;
- refresh/poll provider state when webhooks are unavailable, delayed, or manually requested;
- cancel/void/delete provider attempts best-effort;
- process completion notifications if already present.

### 7.2 River does not replace domain state

River tracks job execution. `SigningAttempt` tracks domain progress.

The worker must always load the attempt and verify its current status before side effects. A queued job is permission to check whether work is still needed, not permission to perform the side effect unconditionally.

### 7.3 Job identity

Jobs must be keyed by attempt and phase.

```text
attempt_id + phase
```

Examples:

```text
RenderAttemptPDF(attempt_id)
SubmitAttemptToProvider(attempt_id)
ReconcileProviderSubmission(attempt_id)
CancelProviderAttempt(attempt_id)
RefreshAttemptProviderStatus(attempt_id)
```

Jobs must not be keyed only by `document_id`, because a document can have multiple attempts over time.

### 7.4 Transactional enqueue

Whenever a state transition requires a follow-up job, the attempt update and River job enqueue must happen in the same PostgreSQL transaction.

Examples:

```text
Create attempt -> enqueue RenderAttemptPDF
PDF_READY -> enqueue SubmitAttemptToProvider
SUBMISSION_UNKNOWN -> enqueue ReconcileProviderSubmission
SUPERSEDED with provider ID -> enqueue CancelProviderAttempt
```

If the transaction commits, the job must exist. If the transaction rolls back, the job must not exist.

The required infrastructure boundary is a transaction-aware signing execution unit of work. Its implementation may wrap River directly, but application/domain services must see a single operation that can:

1. begin a PostgreSQL transaction;
2. update documents, attempts, attempt recipients, and attempt events;
3. enqueue River jobs with `InsertTx` inside the same transaction;
4. commit or roll back the whole transition atomically.

No service may perform an attempt state update and then enqueue the follow-up River job in a separate non-transactional step.

### 7.5 Required River jobs

The implementation must define attempt-scoped River jobs for these phases:

```text
RenderAttemptPDF(attempt_id)
SubmitAttemptToProvider(attempt_id)
ReconcileProviderSubmission(attempt_id)
RefreshAttemptProviderStatus(attempt_id)
CleanupProviderAttempt(attempt_id)
DispatchAttemptCompletion(attempt_id)
```

A job may include expected status or expected attempt version metadata, but `attempt_id` is the primary work identity. Cleanup jobs are the only signing jobs allowed to target terminal historical attempts.

The existing document-completion River behavior must be replaced or evolved so completion dispatch is attempt-aware. Completion jobs must carry enough data to prove that the completed attempt is still the document's active attempt before publishing business completion notifications.

### 7.6 Worker idempotency rule

Every worker must be safe to execute repeatedly.

Worker checklist:

1. Load attempt by ID.
2. Load document and verify `document.active_attempt_id` for every job except historical cleanup jobs.
3. Reject terminal attempts unless the job is a cleanup job intended for terminal attempts.
4. Verify the expected attempt status.
5. Acquire a lease or row lock for the attempt.
6. Recheck status after acquiring the lease.
7. Perform the minimum side effect for the phase.
8. Persist the resulting status and metadata.
9. Enqueue the next job transactionally when the resulting state requires follow-up work.

A worker that sees the attempt is no longer eligible must exit successfully without side effects.

## 8. Concurrency controls

### 8.1 Single active attempt per document

Creating or switching an active attempt must be atomic.

The operation must behave like:

```text
if document.active_attempt_id == expected_old_attempt_id
and document is in a state that permits regeneration
then mark old attempt SUPERSEDED/INVALIDATED
and create new attempt
and set document.active_attempt_id = new_attempt_id
and enqueue first job
commit
```

If the expected active attempt no longer matches, the operation fails with a conflict and the caller must reload current state.

### 8.2 Attempt processing lease

Long-running or side-effectful phases must use a processing lease or equivalent row-level claim.

A lease prevents two workers from submitting the same attempt concurrently. The lease must expire if a worker crashes so that River retry/re-execution can recover.

### 8.3 Public proceed concurrency

If two users hit "proceed to sign" at the same time:

- at most one active attempt is created;
- both users eventually observe the same active attempt;
- the loser does not render or submit anything;
- the loser receives a processing response and polls.

The old CAS idea remains valid but moves from document status transition to attempt creation/activation.

## 9. Artifact model

### 9.1 PDF storage path

PDFs must be stored under an attempt-scoped immutable path.

Recommended logical pattern:

```text
documents/{workspaceID}/{documentID}/attempts/{attemptID}/pre-signed.pdf
```

This is the required logical path format unless a storage adapter requires a prefix. Any adapter-specific prefix must still preserve the full attempt-scoped suffix.

### 9.2 No blind overwrite

A signing attempt must never overwrite another attempt's PDF.

Regeneration creates a new attempt and a new PDF path.

### 9.3 Checksum

Every stored PDF must have a checksum/fingerprint persisted on the attempt.

Retry workers must verify that the expected artifact exists and matches the expected checksum before provider submission.

If the artifact is missing or checksum mismatches:

- do not silently rerender in a provider retry;
- mark the attempt as `FAILED_PERMANENT`; recovery must happen through explicit regeneration, not implicit rerender;
- require an explicit regeneration if business data must be corrected.

### 9.4 Signature field snapshot

The signature field positions used for provider submission must be snapshotted on the attempt at render time.

Provider submission retry must use this snapshot. It must not rerender Typst only to reconstruct fields.

### 9.5 Provider upload payload snapshot

The provider upload payload must be reproducible from persisted attempt data.

At minimum this includes:

- provider correlation key;
- PDF artifact reference;
- recipients snapshot;
- role mapping;
- signature fields snapshot;
- document title used for provider;
- provider-specific options required for submission.

### 9.6 Completed PDF ownership

The completed/signed PDF is also attempt-owned.

When an active attempt completes, the completed PDF artifact reference, checksum, provider completed-document URL, or provider download metadata must be persisted on that attempt. `documents.completed_pdf_url` may exist only as a business projection of the active completed attempt.

A late completion event from an old attempt must never replace the completed artifact projection for the active document.

If the system stores a provider-downloaded completed PDF, it must use an attempt-scoped immutable path, for example:

```text
documents/{workspaceID}/{documentID}/attempts/{attemptID}/completed-signed.pdf
```

## 10. Provider idempotency and reconciliation

### 10.1 Provider correlation key

Every provider submission must include a deterministic correlation key derived from the attempt, not just from the document.

Recommended logical key:

```text
{document_id}:{attempt_id}
```

A provider must not receive the same document-level key for different attempts.

Provider document ID and provider correlation key are separate concepts:

- provider document ID is the provider's real envelope/document identifier;
- provider correlation key is the attempt-level external reference used to find or reconcile provider state.

Adapters must not overwrite the provider document ID with the external/correlation key when parsing webhooks or status responses.

### 10.2 Provider side effect rule

Submitting to the provider is not locally transactional. The worker must assume the request may have succeeded even if the local process did not receive a success response.

### 10.3 Clean provider failure

A clean failure is one where the system knows the provider did not create or mutate provider state.

Examples:

- connection failed before request was sent;
- local validation failed before request;
- provider returned a validation error without creating state.

Clean retryable failures move the attempt to `PROVIDER_RETRY_WAITING` and let River retry later.

Clean permanent failures move the attempt to `FAILED_PERMANENT`.

### 10.4 Ambiguous provider outcome

An ambiguous outcome is one where the provider may have created or mutated state but the system did not receive a definitive response.

Examples:

- timeout while awaiting provider response after request was sent;
- connection reset after body upload;
- process crash during provider submission;
- provider returns an unclear response with no reliable success/failure semantics.

Ambiguous outcomes must move the attempt to `SUBMISSION_UNKNOWN`.

`SUBMISSION_UNKNOWN` must not auto-resubmit blindly.

### 10.5 Reconciliation

A `ReconcileProviderSubmission` job must resolve `SUBMISSION_UNKNOWN`.

It must attempt to answer:

```text
Does the provider already have a document/envelope for this attempt correlation key?
```

Outcomes:

1. Provider document found and usable:
   - persist provider document ID;
   - persist provider recipient references;
   - move attempt to `SIGNING_READY` or `SIGNING`;
   - update document projection.

2. Provider document confirmed absent:
   - move attempt to `READY_TO_SUBMIT`;
   - enqueue provider submit job.

3. Provider state found but invalid/incomplete:
   - if recoverable, continue reconciliation or cleanup;
   - if not recoverable, mark `REQUIRES_REVIEW`; operator action must choose cleanup/regeneration or permanent failure.

4. Provider still unavailable:
   - stay in reconciliation flow with retry/backoff;
   - do not create a new attempt automatically.

### 10.6 If provider cannot reconcile by correlation key

If the configured provider cannot search or reconcile by attempt correlation key, the attempt remains fragile at the provider boundary.

In that case the design must still avoid blind resubmission from `SUBMISSION_UNKNOWN`. After maximum reconciliation attempts, the attempt must move to `REQUIRES_REVIEW`; operator action must choose regeneration, manual provider linkage, or permanent failure.

### 10.7 Required provider port contract

The signing provider boundary must expose attempt-aware operations. The exact Go interface can be shaped during implementation, but it must support the following capabilities:

```text
SubmitAttemptDocument
FindProviderDocumentByCorrelationKey
GetProviderDocumentStatus
GetAttemptRecipientSigningURL / GetAttemptRecipientEmbeddedURL
CleanupProviderDocument
ProviderCapabilities
```

Provider submit must return either:

- success with provider document ID and provider recipient references;
- a typed provider error with error class and provider phase;
- an ambiguous result that moves the attempt to `SUBMISSION_UNKNOWN`.

Provider capabilities must declare whether the provider supports:

- search/reconciliation by correlation key;
- cancellation/void/delete cleanup;
- embedded signing URLs;
- completed PDF download;
- webhook correlation payloads with both provider ID and external/correlation key.

If a capability is unsupported, the domain must follow the explicit state rules in this spec. It must not silently fall back to unsafe retry or document-centric behavior.

### 10.8 Provider submit phases

Provider submission is not a single opaque call. The attempt must track the current provider phase so failures can be classified correctly.

Required logical phases:

```text
BEFORE_REQUEST
CREATE_PROVIDER_DOCUMENT
ADD_RECIPIENTS
CREATE_FIELDS
DISTRIBUTE_DOCUMENT
FETCH_SIGNING_REFERENCES
```

For providers whose API differs from Documenso, adapters must map their steps to the nearest logical phase. If a failure occurs after the provider may have created or mutated state, the error must be classified as `AMBIGUOUS` unless the adapter can prove the provider did not mutate state.

## 11. Retry policy

### 11.1 Retryable failures

Automatic retry is allowed for transient failures:

- network errors before confirmed provider mutation;
- provider 5xx;
- rate limits;
- temporary provider outage;
- temporary GCS error;
- database serialization/deadlock retry where safe;
- worker crash before side effect;
- worker crash after local state update but before next job enqueue if transactional enqueue was not reached.

### 11.2 Permanent failures

Automatic retry is not allowed for permanent failures:

- invalid signer data;
- missing signer role mapping;
- invalid signature field snapshot;
- provider validation rejection;
- corrupted PDF artifact;
- missing immutable PDF artifact;
- template/render semantic error;
- authorization or configuration error.

Permanent failures move to `FAILED_PERMANENT` and the document projection moves to `ERROR` unless the attempt is no longer active.

### 11.3 Ambiguous failures

Ambiguous failures do not use direct provider submission retry.

They move to `SUBMISSION_UNKNOWN` and are handled by reconciliation.

### 11.4 Backoff

Retries must use bounded exponential backoff with jitter.

The implementation will use River retry mechanics, but the domain status must still represent whether the attempt is:

- waiting to retry provider submission;
- reconciling ambiguous provider state;
- permanently failed.

### 11.5 Retry exhaustion

After retry exhaustion:

- transient provider submit failures become `REQUIRES_REVIEW`;
- reconciliation exhaustion becomes `REQUIRES_REVIEW`;
- unrecoverable validation/config/artifact failures become `FAILED_PERMANENT`;
- no infinite retry loop is allowed.

## 12. Regeneration flow

### 12.1 When regeneration is allowed

Regeneration is allowed when business data, signer data, template data, or rendered content is wrong and the current attempt must not continue.

Because there are no active users yet, the system does not need to preserve old behavior. The clean rule is:

```text
Regeneration always creates a new attempt.
```

### 12.2 Regeneration before provider submission

If the active attempt has not reached provider submission:

1. Mark the active attempt `SUPERSEDED`.
2. Create a new attempt.
3. Set document active attempt to the new attempt.
4. Enqueue render job for the new attempt.

No provider cleanup is needed.

### 12.3 Regeneration after provider submission

If the active attempt has provider state:

1. Atomically mark old attempt `SUPERSEDED`.
2. Create new attempt.
3. Set document active attempt to new attempt.
4. Enqueue render job for new attempt.
5. Enqueue best-effort provider cancellation for old attempt.

Cancellation of the old provider document must not block the new attempt.

### 12.4 Regeneration after one or more signatures

If any recipient signed the old attempt, those signatures stay attached to the old attempt only.

They do not count toward the new attempt.

The old attempt remains auditable as superseded or invalidated. The new attempt starts with unsigned attempt recipients.

### 12.5 Regeneration after completion

Completed attempts are immutable. A completed document must not be reopened by replacing its active attempt.

If a completed contract contains bad data, the system must create a new logical correction document linked to the completed document as its source/correction target. The completed document remains completed for audit purposes.

This rule keeps completed legal artifacts immutable and avoids mixing a completed signature process with a new correction process.

### 12.6 Old public links after regeneration

A public signing token or URL tied to a superseded/invalidated attempt must not allow signing that old attempt.

Default behavior:

```text
Show: "This document was updated. Please open the latest signing link."
```

Automatic redirect to the active attempt is not the default because it can hide audit boundaries and signer identity checks.

## 13. Public signing flow

### 13.1 Current signing page resolution

Public signing must resolve tokens to both:

- document;
- attempt, if the token was issued for an attempt-specific flow.

If the token predates an attempt, the service resolves the document and current active attempt.

### 13.2 Before attempt exists

If a signer opens a document that requires signing and no active attempt exists:

1. The request initiates attempt creation when the user action is `ProceedToSigning` and no active attempt exists.
2. Attempt creation is atomic and idempotent at the document level.
3. Response is `processing` while River renders/submits.
4. Frontend polls until the active attempt is ready.

### 13.3 Attempt preparing

If active attempt is in:

```text
CREATED
RENDERING
PDF_READY
READY_TO_SUBMIT
SUBMITTING_PROVIDER
PROVIDER_RETRY_WAITING
SUBMISSION_UNKNOWN
RECONCILING_PROVIDER
```

Public response must be a processing state. It must not expose stale provider URLs.

### 13.4 Attempt ready

If active attempt is `SIGNING_READY` or `SIGNING`, public response returns the embedded signing URL for the current recipient.

The URL must be derived from the active attempt's provider recipient state.

### 13.5 Attempt invalidated/superseded

If a token points to an invalidated or superseded attempt:

- do not sign;
- do not silently submit the old PDF;
- show document-updated/link-invalid response;
- instruct the frontend to request a new link.

### 13.6 Attempt completed

If active attempt is completed:

- signed recipients are allowed to see completion/download state according to existing authorization rules;
- unsigned old attempt tokens must not produce a signing URL.

### 13.7 Token-attempt binding

Public access tokens must become attempt-aware without preserving legacy token behavior.

Rules:

1. A token may be created before an attempt exists. In that case it is a document-entry token and may initiate or observe the document's active attempt.
2. Once a token is used to proceed into a provider signing flow, it must be bound to the active attempt used for that response.
3. A token bound to an attempt can only operate on that attempt.
4. If the bound attempt is `SUPERSEDED`, `INVALIDATED`, or `CANCELLED`, the token must return the document-updated/link-invalid response.
5. A token must not automatically redirect from an old attempt to a newer attempt.
6. Authenticated signing sessions follow the same rules. Reused authenticated tokens must not bypass attempt invalidation.
7. Token invalidation must operate against document-entry tokens and attempt-bound tokens for the target document.

The clean schema may add nullable `attempt_id` to `document_access_tokens` or split document-entry tokens from attempt-bound signing tokens. Whichever shape is chosen, the behavior above is mandatory.

## 14. Authenticated signing-session flow

The authenticated signing session endpoint must use the same attempt model.

High-level flow:

```text
POST /api/v1/signing-sessions/{documentId}
  -> authenticate user by configured resolver
  -> resolve logical document
  -> resolve recipient identity/access
  -> resolve active attempt
  -> if no active attempt and signing can start, create attempt + enqueue River job
  -> if attempt preparing, return processing/pending state or public URL that shows processing
  -> if attempt ready, return direct public signing URL for active attempt
```

The authenticated flow must not create a provider submission outside the attempt/River model.

## 15. Webhook flow

### 15.1 Webhook correlation

Provider webhooks must be correlated to an attempt using provider document ID and provider name.

Webhook parsing must preserve both identifiers when the provider sends both:

- the provider's real document/envelope ID;
- the provider external ID / correlation key.

The provider document ID is the primary webhook lookup key after successful submission. The external/correlation key is a reconciliation aid and must not replace the provider document ID in the event model.

If provider document ID belongs to a historical attempt, the webhook is stored as an attempt event and must not update the active document projection.

### 15.2 Active attempt check

Before updating document projection from a webhook:

1. Find attempt by provider document ID.
2. Verify attempt is not invalidated/superseded/cancelled.
3. Verify document active attempt ID equals webhook attempt ID.
4. Apply recipient/status update to attempt state.
5. Recompute document projection from active attempt.

### 15.3 Late webhook from old attempt

Late webhook behavior:

```text
if webhook.attempt_id != document.active_attempt_id:
    record event on historical attempt
    do not update document.status
    do not update current recipient status
```

### 15.4 Completion

When active attempt completes:

1. Attempt moves to `COMPLETED`.
2. Document projection moves to `COMPLETED`.
3. Completion notification job is enqueued transactionally through River.

Existing River completion behavior must be preserved and made attempt-aware.

## 16. Provider cleanup flow

### 16.1 Best-effort cleanup

Provider cleanup is best-effort.

It applies when an attempt with provider state becomes:

- `SUPERSEDED`;
- `INVALIDATED`;
- `CANCELLED`.

Cleanup job attempts the best supported provider cleanup operation. Provider cleanup capability must be explicit.

Supported cleanup actions are:

```text
CANCEL
VOID
DELETE
UNSUPPORTED
```

The provider adapter chooses the strongest safe action available for a non-completed provider document. If the provider has no supported cleanup operation, the attempt records cleanup as `UNSUPPORTED`.

### 16.2 Cleanup failure

Cleanup failure must not reactivate the attempt and must not block a newer attempt.

The old attempt records cleanup status:

```text
cleanup_status = PENDING | SUCCEEDED | FAILED_RETRYABLE | FAILED_PERMANENT | UNSUPPORTED
```

Cleanup is retried independently when `cleanup_status = FAILED_RETRYABLE`.

### 16.3 Cleanup success

Cleanup success records provider cleanup metadata on the old attempt.

It does not change the active document unless the cleanup target is the current active attempt and the document itself was cancelled.

### 16.4 Review-state recovery actions

`REQUIRES_REVIEW` is terminal for automatic processing, but it must have explicit operator recovery paths. The implementation must provide backend/service operations, and eventually admin UI affordances, for these actions:

- retry reconciliation after operator confirms provider state is safe to inspect again;
- manually link a provider document to the attempt when the provider document is known and matches the attempt payload/correlation identity;
- regenerate the document, which supersedes the current attempt and creates a new one;
- mark the attempt as `FAILED_PERMANENT` with reason;
- request provider cleanup for a known provider document.

No `REQUIRES_REVIEW` action may silently resubmit to the provider unless reconciliation first confirms absence of provider state for the attempt correlation key.

## 17. State transition summary

### 17.1 Normal flow

```text
Document: AWAITING_INPUT
  -> create active attempt

Attempt: CREATED
  -> RENDERING
  -> PDF_READY
  -> READY_TO_SUBMIT
  -> SUBMITTING_PROVIDER
  -> SIGNING_READY
  -> SIGNING
  -> COMPLETED

Document projection:
  AWAITING_INPUT
  -> PREPARING_SIGNATURE
  -> READY_TO_SIGN
  -> SIGNING
  -> COMPLETED
```

### 17.2 GCS succeeds, provider down

```text
Attempt:
  PDF_READY
  -> READY_TO_SUBMIT
  -> SUBMITTING_PROVIDER
  -> PROVIDER_RETRY_WAITING
  -> SUBMITTING_PROVIDER
  -> SIGNING_READY
```

The PDF is not rerendered. The same attempt is retried.

### 17.3 Provider outcome ambiguous

```text
Attempt:
  READY_TO_SUBMIT
  -> SUBMITTING_PROVIDER
  -> SUBMISSION_UNKNOWN
  -> RECONCILING_PROVIDER
     -> SIGNING_READY       if provider document exists
     -> READY_TO_SUBMIT     if provider absence is confirmed
     -> REQUIRES_REVIEW     if reconciliation cannot safely continue
```

No blind provider resubmission from `SUBMISSION_UNKNOWN`.

### 17.4 Regeneration

```text
Old attempt:
  SIGNING_READY or SIGNING or PROVIDER_RETRY_WAITING
  -> SUPERSEDED

Document:
  active_attempt_id: old -> new
  status: PREPARING_SIGNATURE

New attempt:
  CREATED -> ... -> SIGNING_READY

Cleanup:
  CancelProviderAttempt(old_attempt_id) best-effort
```

### 17.5 Late webhook

```text
Webhook for old provider document
  -> find old attempt
  -> old attempt != document.active_attempt_id
  -> record historical event only
  -> document projection unchanged
```

## 18. Error handling conventions

### 18.1 Error classification

Workers and provider adapters must classify errors as:

```text
TRANSIENT
PERMANENT
AMBIGUOUS
CONFLICT_STALE
```

Definitions:

- `TRANSIENT`: retryable infrastructure/provider/network failure where the system can safely retry the same phase.
- `PERMANENT`: invalid data/config/payload/artifact failure.
- `AMBIGUOUS`: provider side effect may have happened.
- `CONFLICT_STALE`: job is no longer applicable because attempt/document moved on.

Provider adapters must not return opaque generic errors for provider submission phases. They must return typed errors or typed results that include:

- error class;
- provider phase;
- provider name;
- provider document ID if known;
- retryability;
- safe-to-resubmit flag.

### 18.2 Worker response by error class

```text
TRANSIENT      -> let River retry or schedule retry state
PERMANENT      -> attempt FAILED_PERMANENT
AMBIGUOUS      -> attempt SUBMISSION_UNKNOWN + enqueue reconciliation
CONFLICT_STALE -> exit success without side effect
```

### 18.3 User-facing states

Users must not see internal status names.

Suggested mapping:

```text
CREATED/RENDERING/PDF_READY/READY_TO_SUBMIT/SUBMITTING_PROVIDER/PROVIDER_RETRY_WAITING/SUBMISSION_UNKNOWN/RECONCILING_PROVIDER
  -> "Preparing document"

SIGNING_READY/SIGNING
  -> "Ready to sign" / embedded signer

COMPLETED
  -> "Completed"

SUPERSEDED/INVALIDATED
  -> "Document updated"

FAILED_PERMANENT
  -> "Document unavailable; contact support"
```

## 19. Data consistency rules

1. A document cannot point to an attempt from another document.
2. A document cannot have two active attempts.
3. A terminal attempt cannot become active again.
4. A provider document ID belongs to at most one attempt.
5. A signing URL belongs to exactly one attempt recipient.
6. Attempt recipients are snapshotted for provider submission.
7. An old attempt webhook cannot update the active document projection.
8. A River job must not perform side effects if the attempt status is stale.
9. Provider submission must include an attempt-level correlation key.
10. PDF artifact path must include attempt identity.
11. Completed PDF artifact path must include attempt identity when stored internally.
12. Document access tokens bound to an attempt cannot operate on any other attempt.
13. `REQUIRES_REVIEW` attempts cannot be automatically resubmitted.
14. Cleanup failure on an old attempt cannot alter the active document projection.
15. Document-level signing state must be a projection from active attempt state, not a second source of truth.

## 20. Observability

Each attempt transition must emit structured events/logs with:

- document ID;
- attempt ID;
- old status;
- new status;
- River job kind;
- River job ID when the transition is caused by a River job;
- provider name;
- provider document ID if available;
- error class;
- retry count;
- correlation key.

Recommended attempt events:

```text
ATTEMPT_CREATED
ATTEMPT_RENDER_STARTED
ATTEMPT_PDF_READY
ATTEMPT_PROVIDER_SUBMIT_STARTED
ATTEMPT_PROVIDER_SUBMIT_RETRY_WAITING
ATTEMPT_PROVIDER_SUBMISSION_UNKNOWN
ATTEMPT_PROVIDER_RECONCILIATION_STARTED
ATTEMPT_PROVIDER_RECONCILED
ATTEMPT_SIGNING_READY
ATTEMPT_SIGNING_STARTED
ATTEMPT_COMPLETED
ATTEMPT_SUPERSEDED
ATTEMPT_INVALIDATED
ATTEMPT_FAILED_PERMANENT
ATTEMPT_PROVIDER_CLEANUP_STARTED
ATTEMPT_PROVIDER_CLEANUP_FINISHED
```

## 21. Testing expectations

Implementation must include tests for these flows.

### 21.1 Unit tests

- Document projection derives from active attempt.
- Terminal attempts cannot be retried.
- Regeneration creates a new attempt and supersedes the old one.
- Stale jobs exit without side effects.
- Error classification maps to correct attempt status.
- Provider ambiguous outcome maps to `SUBMISSION_UNKNOWN`.

### 21.2 Repository/integration tests

- Atomic active attempt switch prevents two active attempts.
- Transactional enqueue creates River job only when state update commits.
- Attempt-level unique job dedup prevents duplicate phase jobs.
- Provider document ID uniqueness is enforced.
- Late webhook for old attempt does not update document projection.

### 21.3 Worker tests

- Render worker creates immutable PDF artifact and snapshot.
- Submit worker uses stored PDF/snapshot and does not rerender.
- Submit worker retries transient provider failure.
- Submit worker enters reconciliation for ambiguous provider response.
- Reconcile worker resumes existing provider document if found.
- Reconcile worker resubmits only after absence is confirmed.
- Cleanup worker failure does not block new active attempt.

### 21.4 End-to-end flow tests

- Normal public signing flow completes.
- Authenticated signing-session flow returns current active attempt URL.
- GCS success + provider outage recovers via River retry.
- Provider timeout after possible creation enters reconciliation.
- Regeneration invalidates old URL and creates new active attempt.
- Old webhook after regeneration is ignored for active document.

### 21.5 Deterministic failure injection tests

The implementation must include deterministic test/failpoint support for signing attempt workers. These failpoints must be unavailable in production configuration.

Required induced failures:

- crash/fail before rendering starts;
- crash/fail after PDF storage succeeds but before `PDF_READY` commit;
- crash/fail after `PDF_READY` commit but before submit job execution;
- storage download missing or checksum mismatch before provider submit;
- provider transient failure before any provider mutation;
- provider ambiguous failure after provider document creation may have succeeded;
- provider failure after recipients or fields may have been created;
- failure after provider accepted submission but before local provider metadata commit;
- duplicate River execution of the same phase;
- stale River job after regeneration;
- late webhook from superseded attempt;
- cleanup failure after regeneration;
- reconciliation exhaustion into `REQUIRES_REVIEW`.

Each failure test must prove the system resumes from the persisted attempt checkpoint or stops safely in the required terminal/review state without creating duplicate active provider submissions.

## 22. Migration stance

No backward compatibility is required.

Required implementation stance:

- destructive migration/reset for signing-related columns/data is allowed and preferred when it simplifies the final model;
- existing non-production signing documents, provider references, public tokens, pending signing URLs, and retry metadata may be cleared;
- old document-centric provider fields must be removed as source-of-truth state;
- old scheduler jobs for provider upload/retry must be removed from the signing flow;
- no legacy fallback path may remain merely to preserve current behavior.

The final system must have one signing execution model: active attempt + River jobs.

## 23. Closed decisions

The following decisions are fixed for this design:

1. Completed document correction creates a new logical correction document. Completed attempts and completed documents are not reopened.
2. Retry exhaustion uses `REQUIRES_REVIEW`. Truly unrecoverable validation/config/artifact failures use `FAILED_PERMANENT`.
3. Old URLs for superseded/invalidated attempts show an explicit "document updated" response. They do not redirect automatically.
4. River is the only queue/worker mechanism for signing attempt side effects. The provider-upload polling scheduler must be removed from this flow.
5. Retry never means regeneration. Regeneration always creates a new attempt, except completed corrections which create a new logical document.
6. Provider cleanup is best-effort and cannot block a new active attempt.
7. Provider ambiguous outcomes always go through reconciliation before any resubmission.
8. There is no alternate compatibility design for this product stage. The correct design is the clean attempt-first replacement described here.
9. Tokens, recipients, completed artifacts, provider IDs, retries, and signing URLs are attempt-owned.
10. Document-level signing fields are projections only, if they exist at all.

## 24. Required implementation direction

The required implementation direction is:

1. Introduce attempt model, attempt recipients, attempt events, and active attempt pointer.
2. Move render/provider/retry/signing-url/completed-artifact ownership from document-level semantics to attempt-level semantics.
3. Replace provider-upload scheduler flow with attempt-scoped River jobs.
4. Implement transaction-aware state transition + River enqueue boundary.
5. Implement provider port changes for attempt submission, reconciliation, typed errors, capabilities, cleanup, and status/signing URL retrieval.
6. Make public/authenticated signing resolve through active attempt and bind tokens to attempts when signing begins.
7. Make provider webhooks attempt-aware and preserve provider document ID separately from provider correlation key.
8. Add reconciliation for ambiguous provider submission.
9. Keep provider cleanup best-effort but explicit and observable.
10. Remove legacy document-centric upload retry behavior and old scheduler paths from the signing flow.
11. Update API/OpenAPI/frontend/docs to expose business/user-facing states without leaking internal attempt statuses.

This is intentionally a clean redesign rather than a compatibility patch.

## 25. Definition of Done

Implementation is not done when unit tests pass. It is done only after the full project is running locally and the signing engine has been validated end-to-end against success paths and induced failure/recovery paths.

### 25.1 Local system must be running

The project must be brought up locally with all services needed for real signing execution, including Documenso. Docker or Docker Compose may be used.

The running stack must include, as applicable:

- PostgreSQL with current migrations;
- backend API;
- frontend app;
- River workers enabled;
- storage backend or local storage adapter configured for immutable attempt artifacts;
- Documenso running locally or reachable through the project docker setup;
- Documenso credentials/webhook configuration wired into the backend;
- webhook delivery path validated from Documenso to the backend.

### 25.2 Success-path validation

The following live flows must pass against the running stack:

1. Public direct signing flow (`SIGNING` token, no interactive fields) reaches completion.
2. Public pre-signing flow (`PRE_SIGNING` token, interactive fields) stores responses, renders, submits, signs, and completes.
3. Authenticated signing-session flow returns a current active-attempt signing URL/session and completes.
4. Multi-signer ordering prevents later signers from signing early and then advances correctly.
5. Completed attempt updates document projection and dispatches completion notification through River.
6. Completed PDF download or provider completed-document reference resolves from the completed active attempt.
7. Regeneration before provider submission supersedes the old attempt and creates a new active attempt.
8. Regeneration after provider submission supersedes the old attempt, creates a new active attempt, and starts best-effort cleanup.
9. Old public links for superseded/invalidated attempts show the document-updated/link-invalid response.

### 25.3 Induced failure and resume validation

The implementation must induce failures at every critical stage and prove the system resumes safely or stops in the intended review/terminal state.

Required live or deterministic failpoint validations:

1. Failure before render starts: River retry resumes render for the same attempt.
2. Failure after PDF is stored but before local commit: no attempt exposes a half-committed artifact as ready.
3. Failure after `PDF_READY` commit and before submit: submit resumes from stored PDF/checksum without rerendering.
4. Missing/corrupt PDF or checksum mismatch: attempt becomes `FAILED_PERMANENT`; no implicit rerender occurs.
5. Provider transient failure before mutation: same attempt retries and eventually reaches signing-ready.
6. Provider ambiguous failure after possible provider creation: attempt enters `SUBMISSION_UNKNOWN`, then reconciliation resolves before any resubmission.
7. Provider document found during reconciliation: local attempt records provider IDs/recipients and continues without duplicate provider document creation.
8. Provider absence confirmed during reconciliation: same attempt returns to submit flow and submits once.
9. Provider cannot be reconciled or remains inconsistent: attempt reaches `REQUIRES_REVIEW` without blind retry.
10. Crash/failure after provider accepts submission but before local metadata commit: reconciliation recovers the provider document or moves to review; it does not create a duplicate active submission.
11. Duplicate River execution for the same phase: only one side effect happens, or later executions exit successfully as stale/no-op.
12. Stale submit/render job after regeneration: job exits without side effects and cannot mutate the new active attempt.
13. Late webhook from old attempt after regeneration: event is stored historically and document projection remains unchanged.
14. Cleanup failure for old provider attempt: new active attempt continues; cleanup state records retryable/permanent/unsupported result.
15. Backend/River process restart during each major phase: processing resumes from persisted attempt checkpoint.

Where a real external failure cannot be reliably produced through Docker Documenso alone, deterministic non-production failpoints or test adapters must be used to induce the exact phase failure. Those failpoints must be disabled or impossible to activate in production configuration. The real Documenso success path must still be validated live.

### 25.4 Evidence required

Completion evidence must include:

- commands used to start the local stack;
- test commands and outputs;
- relevant backend/River logs showing attempt IDs, job IDs, status transitions, and provider IDs;
- database evidence for attempts, active attempt pointer, attempt recipients, attempt events, and River jobs;
- provider evidence from Documenso UI/API showing that duplicate active provider documents were not created;
- frontend/public signing evidence for processing, signing, completed, document-updated, and error/review states.

A result is not accepted as complete if validation only uses unit tests or mocks. Unit/integration tests are required, but final acceptance requires the live running project with Documenso plus induced failure/resume validation.
