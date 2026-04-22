# Evidence — Signing Attempts + River clean-slate

Fecha: 2026-04-22  
Workspace: `/Users/rendis/Documents/Projects/Libraries/doc-assembly/.worktrees/signing-attempts-river-clean-slate`  
Branch: `feature/signing-attempts-river-clean-slate`  
Spec source of truth: `/Users/rendis/Documents/Projects/Libraries/doc-assembly/docs/superpowers/specs/2026-04-22-signing-attempts-river-design.md`

## Resultado

Implementación clean-slate aplicada y validada localmente:

- `SigningAttempt` es la fuente técnica de verdad para render, provider submit, retry/reconciliation, cleanup, status refresh y completion dispatch.
- `execution.documents` queda como proyección de negocio con `active_attempt_id`.
- River es el único motor durable para fases signing attempt-scoped.
- No quedó camino de provider upload/retry vía scheduler/document-centric legacy.
- Documenso local fue usado como provider real para submit, embedded signing, completion y descarga del PDF firmado.
- Los tokens/secrets completos no se incluyen en esta evidencia.

## Verificación automatizada

| Área | Comando | Resultado | Log |
|---|---|---:|---|
| Backend OpenAPI | `make -C /Users/rendis/Documents/Projects/Libraries/doc-assembly/.worktrees/signing-attempts-river-clean-slate/core swagger` | PASS | `/tmp/docassembly-postfallback-core-swagger.log` |
| Backend build | `make -C /Users/rendis/Documents/Projects/Libraries/doc-assembly/.worktrees/signing-attempts-river-clean-slate/core build` | PASS | `/tmp/docassembly-postfallback-core-build.log` |
| Backend unit | `make -C /Users/rendis/Documents/Projects/Libraries/doc-assembly/.worktrees/signing-attempts-river-clean-slate/core test` | PASS | `/tmp/docassembly-postfallback-core-test.log` |
| Backend lint | `make -C /Users/rendis/Documents/Projects/Libraries/doc-assembly/.worktrees/signing-attempts-river-clean-slate/core lint` | PASS, `0 issues` | `/tmp/docassembly-postfallback-core-lint.log` |
| Backend integration compile/run | `go test -C /Users/rendis/Documents/Projects/Libraries/doc-assembly/.worktrees/signing-attempts-river-clean-slate/core -tags=integration ./... -count=1` | PASS | `/tmp/docassembly-postfallback-go-integration-all.log` |
| Frontend tests | `pnpm --dir /Users/rendis/Documents/Projects/Libraries/doc-assembly/.worktrees/signing-attempts-river-clean-slate/app test:run` | PASS, 19 files / 88 tests | `/tmp/docassembly-final-verify-app-test-run.log` |
| Frontend build | `pnpm --dir /Users/rendis/Documents/Projects/Libraries/doc-assembly/.worktrees/signing-attempts-river-clean-slate/app build` | PASS | `/tmp/docassembly-final-verify-app-build.log` |
| Frontend lint | `pnpm --dir /Users/rendis/Documents/Projects/Libraries/doc-assembly/.worktrees/signing-attempts-river-clean-slate/app lint` | PASS con 1 warning preexistente de React Compiler en `TemplateDetailPage.tsx` | `/tmp/docassembly-final-verify-app-lint.log` |

Nota: el plan original incluía `make -C core wire`, pero el Makefile actual de este checkout no expone target `wire`; por eso no aplica como comando ejecutable en esta rama. Sí se regeneró Swagger y se compiló el backend completo.

## Stack local levantado

Servicios Docker usados:

- PostgreSQL del proyecto: `signing-attempts-river-clean-slate-postgres-1`, puerto `5432`.
- Documenso DB: `signing-attempts-river-clean-slate-documenso-db-1`, puerto `5433`.
- Documenso: `signing-attempts-river-clean-slate-documenso-1`, puerto `3000`.
- Mailpit: `signing-attempts-river-clean-slate-mailpit-1`, puertos `1025`/`8025`.

Backend local iniciado con workers River:

```bash
DOC_ENGINE_WORKER_ENABLED=true \
DOC_ENGINE_WORKER_MAX_WORKERS=4 \
DOC_ENGINE_SIGNING_PROVIDER=documenso \
DOC_ENGINE_SIGNING_BASE_URL=http://localhost:3000/api/v2 \
DOC_ENGINE_SIGNING_SIGNING_BASE_URL=http://localhost:3000 \
DOC_ENGINE_SIGNING_WEBHOOK_URL=http://host.docker.internal:8080/webhooks/signing/documenso \
DOC_ENGINE_STORAGE_PROVIDER=local \
DOC_ENGINE_STORAGE_LOCAL_DIR=/tmp/docassembly-live-storage \
go run ./cmd/api
```

Evidencia de health desde host y desde el contenedor Documenso hacia backend:

- Host → backend: `{"service":"doc-engine","status":"healthy"}`.
- Documenso container → `http://host.docker.internal:8080/health`: `{"service":"doc-engine","status":"healthy"}`.
- Replay provider-container del payload real Documenso completed → backend webhook: `/tmp/docassembly-live/provider-container-replay.status`, `provider_container_replay_http_status=200`.

## Modelo DB / River

Migración clean-slate aplicada:

- Log: `/tmp/docassembly-live-migrate.log`.
- Snapshot final DB/River: `/tmp/docassembly-live/final-evidence/app-db-and-river-snapshot.log`.

Documentos/attempts principales:

| Caso | Document ID | Active Attempt ID | Estado documento | Estado attempt | Provider document |
|---|---|---|---|---|---|
| Success direct/multisigner | `9a71e3aa-e9db-4d81-beda-bbe97399d820` | `52ad4de4-1be8-40c0-a100-f2980d7c4f7c` | `COMPLETED` | `COMPLETED` | `envelope_rffwsleyvymedomu` |
| Old link superseded | `aa19a115-58c4-4097-9856-a23e7492d252` | `de973d38-1ce6-4f0d-8f34-af446ae250a7` | `PREPARING_SIGNATURE` | `CREATED` | n/a |
| Unavailable/review | `9068e329-20f6-41ee-b40e-64b4ce953efa` | `96adba3a-7e8f-4249-9f38-f68a216f0853` | `ERROR` | `REQUIRES_REVIEW` | `envelope_rmldihdbirbvrmyb` |

PDF immutable pre-signed path validado en DB:

```text
documents/22222222-2222-2222-2222-222222222222/9a71e3aa-e9db-4d81-beda-bbe97399d820/attempts/52ad4de4-1be8-40c0-a100-f2980d7c4f7c/pre-signed.pdf
```

River jobs attempt-scoped observados:

```text
dispatch_attempt_completion | completed | 1
render_attempt_pdf          | completed | 8
submit_attempt_to_provider  | completed | 8
```

Eventos de attempt observados para el success path:

```text
ATTEMPT_CREATED
ATTEMPT_RENDER_STARTED
ATTEMPT_PDF_READY
ATTEMPT_PROVIDER_SUBMIT_STARTED
ATTEMPT_SIGNING_READY
ATTEMPT_COMPLETED
ATTEMPT_WEBHOOK_RECEIVED
```

## Documenso/provider real

Snapshot provider: `/tmp/docassembly-live/final-evidence/documenso-provider-snapshot.log`.

Provider document real:

```text
envelope_rffwsleyvymedomu
externalId = 9a71e3aa-e9db-4d81-beda-bbe97399d820:52ad4de4-1be8-40c0-a100-f2980d7c4f7c
status = COMPLETED
title = Live Signing Direct Flow
```

Recipients en Documenso:

```text
alice-live@example.local | signingOrder=1 | SIGNED
bob-live@example.local   | signingOrder=2 | SIGNED
```

Descarga PDF firmado provider → backend → público:

- Provider endpoint probado: `GET /api/v2/envelope/item/{envelopeItemId}/download?version=signed` con API key Documenso.
- Backend public endpoint probado: `GET /public/sign/{redacted-token}/download`.
- Resultado: `HTTP/1.1 200 OK`, `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="document_signed.pdf"`, PDF `%PDF-`, 215331 bytes.
- Log: `/tmp/docassembly-live/public-download-after-fallback.log`.

## Frontend / public signing

Frontend Vite levantó en puerto `5173`; además se validó la SPA embebida servida por backend (`http://localhost:8080`) con Playwright.

Screenshots locales:

- Completed: `/Users/rendis/Documents/Projects/Libraries/doc-assembly/.worktrees/signing-attempts-river-clean-slate/output/playwright/public-completed-live.png`.
- Document updated: `/Users/rendis/Documents/Projects/Libraries/doc-assembly/.worktrees/signing-attempts-river-clean-slate/output/playwright/public-document-updated-live.png`.
- Unavailable: `/Users/rendis/Documents/Projects/Libraries/doc-assembly/.worktrees/signing-attempts-river-clean-slate/output/playwright/public-unavailable-live.png`.
- Documenso embedded signing field: `/Users/rendis/Documents/Projects/Libraries/doc-assembly/.worktrees/signing-attempts-river-clean-slate/output/playwright/documenso-signing-field.png`.

API public states capturados:

- `processing`: `/tmp/docassembly-live/sign-page-initial.json`, `/tmp/docassembly-live/proceed.json`.
- `signing`: `/tmp/docassembly-live/sign-page-after-river.json`.
- `completed`: `/tmp/docassembly-live/sign-page-completed-3.pretty.json`.
- `document_updated`: `/tmp/docassembly-live/states/doc-updated-public-state-2.redacted.log`.
- `unavailable`: `/tmp/docassembly-live/states/public-document-updated-unavailable-redacted.log`.

## Success paths validados

- Public `SIGNING` direct flow: render → submit River → Documenso embedded signing → completed webhook replay → public completed/download.
- Public `PRE_SIGNING` form path: validado con E2E live completo en el addendum de este documento: form público → preview con respuestas → River render/submit → Documenso/provider → completion webhook → DB/River completed → descarga PDF firmada.
- Authenticated signing-session: cubierto por backend tests e integration compile; no sube provider fuera de attempt/River.
- Multi-signer ordering: validado con dos recipients (`alice-live`, `bob-live`) y `signingOrder` 1/2 en Documenso y attempt recipients.
- Completion dispatch por River: `dispatch_attempt_completion` completed y webhook active → `ATTEMPT_COMPLETED`.
- Completed PDF: backend descarga PDF firmado desde active provider attempt cuando no hay ref local de storage.
- Regeneration / supersede: old attempt `1d0f3121-a665-4016-8957-0e3694ea77e4` queda histórico; active pointer cambia a `de973d38-1ce6-4f0d-8f34-af446ae250a7`; old public links devuelven `document_updated`.

## Fallos inducidos / estados seguros

Script: `/tmp/docassembly-live/run-failpoint-scenarios.sh`  
Resumen: `/tmp/docassembly-live/failpoints/failpoint-summary.log`

Escenarios ejecutados:

1. `render.before`
   - Attempt queda `CREATED`, sin `pdf_storage_path`, River `render_attempt_pdf` retryable, public `processing`.
2. `render.after_store_before_commit`
   - Attempt queda `RENDERING`, sin DB pdf path, River retryable, public `processing`.
3. `submit.before_provider`
   - Attempt queda `READY_TO_SUBMIT`, con PDF/checksum, sin provider doc id, River submit retryable, public `processing`.
4. `submit.corrupt_pdf_checksum`
   - Attempt `FAILED_PERMANENT`, document `ERROR`, evento `ATTEMPT_FAILED_PERMANENT`, public `unavailable`.
5. `submit.after_provider_accepted_before_commit`
   - Attempt `SUBMISSION_UNKNOWN`, eventos `ATTEMPT_PROVIDER_SUBMISSION_UNKNOWN` y `ATTEMPT_PROVIDER_RECONCILIATION_UNSUPPORTED`; restart normal conserva estado seguro/no duplica active pointer.
6. Late/stale/historical webhook
   - Webhook de attempt histórico registra evento y no muta `documents.status` cuando `document.active_attempt_id != attempt_id`.
7. Cleanup failure
   - Cubierto por failpoint no productivo y tests River/DB; failure registra `cleanup_status=FAILED_RETRYABLE` y no bloquea el nuevo active attempt.
8. Duplicate/stale River phase execution
   - Cubierto por integration tests de `riverqueue`: stale completion dispatch no-op y unique jobs por phase/attempt.

## Notas de entorno

- Los BackgroundJob de Documenso local registraron payloads reales de webhook, pero algunos deliveries internos quedaron `FAILED` en la DB de Documenso durante iteraciones donde backend no estaba disponible. Para cerrar la ruta provider-container → backend se reinyectó el payload real desde el contenedor Documenso hacia `host.docker.internal:8080/webhooks/signing/documenso` y respondió `200`.
- No se imprimen API keys ni tokens completos en esta evidencia.

## Addendum — PRE_SIGNING live E2E cerrado

Este addendum cierra el gap que quedaba entre la cobertura automatizada y la validación live: se ejecutó un flujo público `PRE_SIGNING` completo con formulario previo real, render, submit attempt-scoped por River, firma en Documenso, completion webhook, proyección DB y descarga pública del PDF firmado.

### Caso live

| Campo | Valor |
|---|---|
| Document ID | `d525773d-364d-412f-859e-356d2656c47d` |
| Active Attempt ID | `5cdb80e7-c8ed-43ce-a2bc-f50da5f70130` |
| Provider document | `envelope_nhkzzuovyidfablo` |
| Correlation key | `d525773d-364d-412f-859e-356d2656c47d:5cdb80e7-c8ed-43ce-a2bc-f50da5f70130` |
| Pre-signed PDF path | `documents/22222222-2222-2222-2222-222222222222/d525773d-364d-412f-859e-356d2656c47d/attempts/5cdb80e7-c8ed-43ce-a2bc-f50da5f70130/pre-signed.pdf` |

Artefactos principales:

- Seed template PRE_SIGNING: `/tmp/docassembly-live/presigning-e2e/seed-template.log`.
- Create document response: `/tmp/docassembly-live/presigning-e2e/create-response.pretty.json`.
- Public form API response: `/tmp/docassembly-live/presigning-e2e/public-form.pretty.json`.
- Backend/River relevant logs: `/tmp/docassembly-live/presigning-e2e/backend-river-relevant.log`.
- Provider completion script output: `/tmp/docassembly-live/presigning-e2e/documenso-complete-recipients.log`.
- Webhook replay result: `/tmp/docassembly-live/presigning-e2e/webhook-replay.log`.
- DB/River/provider final snapshot: `/tmp/docassembly-live/presigning-e2e/post-completion-db-river-provider.log`.
- Download proof: `/tmp/docassembly-live/presigning-e2e/download.log` and `/tmp/docassembly-live/presigning-e2e/download.pdf`.

Screenshots frontend/provider:

- Form PRE_SIGNING completado: `/Users/rendis/Documents/Projects/Libraries/doc-assembly/.worktrees/signing-attempts-river-clean-slate/output/playwright/presigning-form-filled.png`.
- Preview posterior al formulario, con respuestas insertadas: `/Users/rendis/Documents/Projects/Libraries/doc-assembly/.worktrees/signing-attempts-river-clean-slate/output/playwright/presigning-preview-after-form.png`.
- Iframe Documenso listo para firma: `/Users/rendis/Documents/Projects/Libraries/doc-assembly/.worktrees/signing-attempts-river-clean-slate/output/playwright/presigning-documenso-iframe-ready.png`.
- Campo de firma insertado en Documenso: `/Users/rendis/Documents/Projects/Libraries/doc-assembly/.worktrees/signing-attempts-river-clean-slate/output/playwright/presigning-documenso-first-signer-filled.png`.
- Página pública completed con download link: `/Users/rendis/Documents/Projects/Libraries/doc-assembly/.worktrees/signing-attempts-river-clean-slate/output/playwright/presigning-public-completed.png`.

### Evidencia DB/River/provider

Estado final app DB:

```text
Document.status = COMPLETED
Document.active_attempt_id = 5cdb80e7-c8ed-43ce-a2bc-f50da5f70130
Attempt.status = COMPLETED
Attempt.provider_document_id = envelope_nhkzzuovyidfablo
Attempt recipients = SIGNED / SIGNED
Document recipients projection = SIGNED / SIGNED
```

Eventos del attempt:

```text
ATTEMPT_CREATED
ATTEMPT_RENDER_STARTED
ATTEMPT_PDF_READY
ATTEMPT_PROVIDER_SUBMIT_STARTED
ATTEMPT_SIGNING_READY
ATTEMPT_COMPLETED
ATTEMPT_WEBHOOK_RECEIVED
```

River jobs attempt-scoped para el attempt:

```text
dispatch_attempt_completion | completed | 1
render_attempt_pdf          | completed | 1
submit_attempt_to_provider  | completed | 1
```

Documenso provider:

```text
Envelope.id       = envelope_nhkzzuovyidfablo
Envelope.status   = COMPLETED
Envelope.external = d525773d-364d-412f-859e-356d2656c47d:5cdb80e7-c8ed-43ce-a2bc-f50da5f70130
Recipients        = pre-alice@example.local SIGNED, pre-bob@example.local SIGNED
```

Descarga pública final:

```text
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: attachment; filename="document_signed.pdf"
PDF version 1.7, 2 pages, 227940 bytes, header %PDF-
```

### Nota operacional

La interacción de UI llegó hasta Documenso embedded y se insertó visualmente la firma del primer signer; para cerrar multi-signer y completion sin depender de emails reales ni acciones humanas de dos destinatarios, se usó el script server-only de Documenso dentro del contenedor para completar ambos recipients del envelope real. Luego se reinyectó el payload real `COMPLETED` de Documenso desde el contenedor hacia el backend (`host.docker.internal:8080/webhooks/signing/documenso`) y respondió `200`. La proyección app DB/River quedó `COMPLETED` y la descarga pública sirvió el PDF firmado del provider.
