# WhatsApp Accelerator — Code Review

## Executive summary

This repository is intended to be a web application that onboards a customer’s WhatsApp Business Account (WABA), validates the customer’s website for basic compliance pages, exchanges a Meta authorization code for an access token, discovers a WABA and phone number, registers a webhook, sends a test message, and provides admin views of connected businesses.

The project **type-checks, tests, and builds successfully**, but those checks do not prove the WhatsApp flow works. The test suite contains only one logout test. The live integration is currently not functional end-to-end because the UI sends placeholder customer data, the webhook endpoint is not implemented, and the Meta API integration appears to use incorrect/outdated assumptions. There are also serious security and data-ownership issues that should be fixed before production use.

## What the code is supposed to do

1. The `/onboarding` page asks for a website URL.
2. `server/services/preFlightValidator.ts` fetches that URL and looks for Privacy Policy and Terms of Service text or links.
3. The frontend loads the Facebook SDK and starts a Meta login flow from `MetaEmbeddedSignup.tsx`.
4. The client sends the authorization result to `whatsapp.exchangeCodeForToken`.
5. The server exchanges the code, retrieves WABA information, and stores the account in MySQL through Drizzle.
6. The client asks `whatsapp.registerWebhook` to register a webhook with Meta.
7. The UI simulates inbox setup and connection verification, then displays a dashboard.
8. The dashboard can query WABA status and send a test message.
9. Admin-only routes list, inspect, export, disconnect, and test-message connected accounts.

## Confirmed validation results

| Check | Result | Meaning |
|---|---:|---|
| `pnpm install --frozen-lockfile` | Passed | Dependencies install from the lockfile. |
| `pnpm check` | Passed | TypeScript has no compile-time errors. |
| `pnpm test` | Passed | 1 test file and 1 test passed; coverage is very limited. |
| `pnpm build` | Passed | Vite frontend and esbuild server bundle successfully. |

There is a package-manager warning that the `pnpm` configuration block in `package.json` is ignored by the installed pnpm version. Consequently, the declared patched dependency and override may not be applied consistently.

## Issues likely to prevent intended operation

### Critical: the advertised webhook does not exist

The UI constructs URLs such as `/api/webhooks/whatsapp/:wabaId`, but `server/_core/index.ts` registers only storage, OAuth, and tRPC routes. There is no GET verification handler, POST event handler, signature validation, or inbound-message processing route. Meta therefore cannot verify or deliver webhook events successfully.

### Critical: credentials and privileged operations are exposed publicly

The following tRPC procedures are `publicProcedure`: `exchangeCodeForToken`, `registerWebhook`, `sendTestMessage`, `getConnectionStatus`, and `getWABADetails`. Several accept an access token directly from the browser. The exchange mutation also returns `accessToken` to the client, and the client keeps it in React state. Anyone who can call these endpoints can attempt token exchange, register webhooks, query accounts, or send messages. Tokens are stored unencrypted in `waba_accounts.accessToken`.

These procedures should use authenticated procedures, keep Meta tokens server-side, and accept only an internal account identifier. The server must enforce that the authenticated user owns the account, while admin operations remain role-protected.

### Critical: account ownership is hard-coded to user ID 1

`exchangeCodeForToken` writes every WABA with `userId: 1`, regardless of the authenticated user. On a real database this can violate the foreign key if user 1 does not exist, and otherwise all customers become associated with the same account. The procedure is public, so there is no reliable owner context at all.

### Critical: the onboarding flow uses fake customer data

`Onboarding.tsx` sends `businessName: "Your Business"` and `phoneNumber: "+1234567890"`, then stores the same placeholders in the dashboard. This means records and notifications do not describe the real business. The code also claims to capture business and phone data from Meta but does not do so.

### High: Meta API integration appears incorrect or incomplete

`metaApiService.ts` uses `https://graph.instagram.com` as the base for WhatsApp Business calls. The WhatsApp Cloud API normally uses Meta’s Graph API host and a currently supported API version. The implementation hard-codes `v18.0`, which is obsolete for a new deployment and may be unavailable or behave differently.

The assumed response from `/me/whatsapp_business_accounts` includes `phone_number_id` directly on the WABA object, but WABA discovery generally requires querying the WABA’s phone-number edges and selecting a phone number. The implementation always selects the first account and does not support user choice when multiple accounts or phone numbers exist.

### High: webhook registration is not enough to configure verification

`registerWebhook` calls Meta endpoints but generates a verify token only afterward and stores it in a separate table. The token is not supplied to a real webhook route, is not persisted back to the WABA row, and is not used to answer Meta’s verification challenge. The webhook URL is also not stored in `waba_accounts.webhookUrl`.

### High: authorization code fallback is unsafe and logically incompatible

The frontend accepts either an authorization `code` or an `accessToken` and passes either value into `exchangeCodeForToken`. The backend always treats the value as an authorization code and performs a code exchange. If Meta returns only a token, the fallback will fail; accepting browser-provided access tokens also expands credential exposure.

### High: SSRF and validation quality risks

The public website validator makes server-side requests to arbitrary user-supplied URLs. It has no allow/block policy for private IP ranges, localhost, cloud metadata endpoints, or unusual URL schemes beyond the Zod URL check. This can become an SSRF vector. It also checks only the initially fetched HTML and does not follow likely Privacy Policy or Terms links, so JavaScript-rendered or linked policies may be incorrectly rejected.

### High: missing production hardening

The TODO explicitly identifies unimplemented token encryption, token refresh, webhook validation, event handling, rate limiting, security headers, CSRF protection, monitoring, API documentation, and integration tests. These are not optional for a service handling Meta credentials and messaging.

### Medium: frontend state and error handling are misleading

The flow simulates inbox setup and verification with delays rather than performing those operations. Errors are mostly logged to the console, and the user is not given a recovery action. `currentStep === "complete"` is never reached. Dashboard queries require the browser-held access token and can silently report `Pending Review` for any API failure, masking authentication, permissions, or endpoint problems.

### Medium: database helper failure semantics hide outages

Many database functions return `null`, empty arrays, or silently warn when `DATABASE_URL` is absent. This can make a deployment appear to succeed while no data is saved. `createBusinessProfile` selects the oldest matching row rather than reliably returning the row just inserted. Export CSV escaping is incomplete for quotes, newlines, and carriage returns.

### Medium: admin filtering and data handling need refinement

Admin filtering uses `displayNameStatus` as a proxy for approval, while WABA account review status is fetched separately and not persisted. The admin list loads every record into memory before filtering, sorting, and paginating, which will degrade at scale. Exported data should be explicitly scoped and CSV-safe.

## Ordered steps to make it functional

1. **Define the supported Meta product and current API contract.** Confirm whether this is WhatsApp Cloud API with Embedded Signup, record the current Graph host/version, required permissions, app settings, redirect URI, webhook subscriptions, and exact response shapes.
2. **Configure and validate required environment variables.** Add `META_APP_ID`, `META_APP_SECRET`, `DATABASE_URL`, `JWT_SECRET`, OAuth settings, and production public URL. Fail fast at startup for required production secrets rather than silently continuing.
3. **Fix authentication and ownership.** Require login for onboarding mutations, use `ctx.user.id`, ensure the user exists, and add ownership checks to every account read/write. Keep admin procedures role-protected.
4. **Move all Meta credentials server-side.** Never return `accessToken` from tRPC, never accept it from the browser, encrypt tokens at rest, and expose only non-sensitive account identifiers and status to the client.
5. **Replace placeholder onboarding inputs.** Collect and validate business name and customer phone number, or obtain the authoritative values from Meta’s Embedded Signup result. Remove `Your Business`, `+1234567890`, and the code/access-token fallback.
6. **Implement the correct Embedded Signup flow.** Use the supported Meta SDK configuration and response format, validate the redirect URI and state/CSRF value, exchange a code exactly once, and handle cancellation, expiration, duplicate connections, and multiple WABAs/phones.
7. **Correct WABA and phone discovery.** Query the selected business account and its phone-number edge, persist the selected WABA ID, phone-number ID, display name, and review status, and handle missing/ambiguous results.
8. **Implement real webhook routes before registering them.** Add `GET /api/webhooks/whatsapp/:wabaId` for Meta challenge verification and `POST` for events. Look up the stored verify token, validate request signatures, parse message/status events, make processing idempotent, and return quickly.
9. **Complete webhook persistence and subscription.** Store the generated verify token and URL consistently, subscribe the desired fields, mark verification only after successful validation, and provide a safe retry/reconnect path.
10. **Implement actual connection verification.** Replace simulated delays with server-side checks for token validity, WABA status, phone-number status, webhook health, and test-message results. Show actionable errors in the UI.
11. **Harden the website validator.** Restrict schemes to HTTP(S), block private/link-local/metadata destinations after DNS resolution, cap response size, validate content type, rate-limit requests, and optionally crawl same-origin policy links instead of relying only on homepage text.
12. **Add database constraints and robust failure handling.** Ensure migrations run against the target MySQL version, add indexes for ownership/status/created time, use transactions for onboarding, make missing database configuration fatal in production, and return the inserted row deterministically.
13. **Add security controls.** Add CSRF/state protection, secure cookie settings, security headers, rate limits, structured redacted logging, request size limits appropriate to webhooks, and secret-safe error messages.
14. **Expand tests.** Add unit tests for Meta response parsing, website validation/SSRF defenses, auth/ownership, token handling, webhook challenge/signature validation, idempotency, and all tRPC procedures. Add mocked Meta integration tests and an end-to-end happy path.
15. **Clean deployment configuration.** Move pnpm overrides/patch settings to the supported pnpm configuration file, document setup and Meta dashboard configuration, deploy over HTTPS, configure the public webhook URL, and run a production smoke test with a Meta test account.

## Recommended first milestone

Do not connect real customer accounts yet. First implement steps 1–8 in a staging environment with mocked Meta responses, then run a single controlled Meta test account through the full flow. The current code is a working UI/build scaffold, not a production-ready WhatsApp onboarding service.

## Key files reviewed

- `server/services/whatsappRouter.ts`
- `server/services/metaApiService.ts`
- `server/_core/index.ts`
- `client/src/pages/Onboarding.tsx`
- `client/src/components/MetaEmbeddedSignup.tsx`
- `server/services/preFlightValidator.ts`
- `drizzle/schema.ts`
- `server/db.ts`
- `server/services/adminRouter.ts`
- `todo.md`
