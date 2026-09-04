# Booking Digital Document Chain — API Reference

The booking freight document chain gives both booking counterparties a shared,
server-backed audit trail across the seven stages of a trip:

| Stage | Typical document |
|---|---|
| `BOOKING` | Booking advice / lorry receipt (LR, Form 23) & freight contract |
| `EWAY_BILL` | GSTN E-Way Bill (Part-A/B assignment) |
| `LOADING` | Loading slip & weighment / payload inspection |
| `TRANSIT` | National transit checkpoint pass / corridor crossing log |
| `DELIVERY` | Arrival gate pass & unloading slip |
| `POD` | Proof of Delivery — consignee sign-off & photo |
| `BALANCE` | Balance payment receipt & commercial tax invoice |

Documents live in **private object storage** (AWS S3 in production, MinIO in local dev).
The API only ever issues **short-lived pre-signed URLs**; the database stores the object key
and upload/verification metadata, never the bytes and never long-lived public links.

---

## Authorization

| Role | List | Upload / register | Download URL | Admin queue / verify |
|---|---|---|---|---|
| `factory_owner` (party) | ✅ | ✅ | ✅ | ❌ |
| `truck_driver` (party) | ✅ | ✅ | ✅ | ❌ |
| `admin` | ✅ (any booking) | ❌ | ✅ (any booking) | ✅ |

"Party" means `bookings.load_owner_id === user.id` or `bookings.truck_owner_id === user.id`.
All routes require a valid `Authorization: Bearer <JWT>` (global `JwtAuthGuard`); the admin
routes additionally require the `admin` role (`RolesGuard`).

---

## 1. List chain documents

```
GET /api/v1/bookings/:bookingId/documents
```

**200 response**

```jsonc
{
  "bookingId": "…",
  "documents": [
    {
      "id": "…",
      "bookingId": "…",
      "stage": "POD",
      "docNumber": "POD-8492",
      "originalFilename": "consignee-pod.jpg",
      "mimeType": "image/jpeg",
      "fileSize": 452193,
      "signedBy": "Ramesh Kumar",
      "uploadedAt": "2026-09-04T07:00:00.000Z",
      "uploadedBy": { "id": "…", "name": "…" },
      "verificationStatus": "Verified",          // Pending | Verified | Rejected
      "verificationNotes": null,
      "verifiedById": null,
      "verifiedAt": "2026-09-04T07:30:00.000Z",
      "verifiedBy": { "id": "…", "name": "…" }
    }
  ]
}
```

Notes:
- `s3_key` is deliberately **not** exposed here — download it through endpoint #4.
- Multiple documents per stage are allowed (e.g. several loading slips).

**Errors:** `404 Booking not found`, `403` (non-party, non-admin).

---

## 2. Request a pre-signed upload URL

```
POST /api/v1/bookings/:bookingId/documents/upload-url
```

Body:

```jsonc
{
  "stage": "POD",                       // one of the 7 stages above
  "fileName": "consignee-pod.jpg",
  "contentType": "image/jpeg",          // image/jpeg | image/png | application/pdf
  "docNumber": "POD-8492",              // optional
  "signedBy": "Ramesh Kumar"            // optional sign-off authority
}
```

**200 response**

```jsonc
{
  "bookingId": "…",
  "stage": "POD",
  "key": "booking-documents/<bookingId>/POD/<uuid>.jpg",
  "uploadUrl": "https://…/…?X-Amz-Signature=…",  // PUT-only, 5-minute expiry
  "contentType": "image/jpeg",
  "expiresIn": 300
}
```

---

## 3. Register a completed upload

After the browser `PUT`s the file bytes directly to `uploadUrl` (plain `fetch`,
no app auth headers — object storage rejects foreign `Authorization` headers), register it:

```
POST /api/v1/bookings/:bookingId/documents
```

Body:

```jsonc
{
  "stage": "POD",
  "key": "booking-documents/<bookingId>/POD/<uuid>.jpg", // must equal the issued key
  "contentType": "image/jpeg",
  "fileName": "consignee-pod.jpg",   // optional
  "docNumber": "POD-8492",           // optional
  "signedBy": "Ramesh Kumar",        // optional
  "fileSize": 452193                 // optional
}
```

Server-side guards:
1. caller must be a booking counterparty,
2. `key` must belong to **this booking + stage** (prefix `booking-documents/<bookingId>/<STAGE>/`)
   and its extension must match `contentType`,
3. the object must actually exist in storage (`HeadObject`) — phantom rows are rejected,
4. re-registering the same key is **idempotent** (returns the existing row).

**200 response:** the created `BookingDocument` (same shape as list items above), with
`verificationStatus: "Pending"` until an admin verifies it.

---

## 4. Download / preview URL

```
GET /api/v1/bookings/:bookingId/documents/:documentId/download-url
```

**200 response**

```jsonc
{
  "bookingId": "…",
  "documentId": "…",
  "stage": "POD",
  "fileName": "consignee-pod.jpg",
  "downloadUrl": "https://…/…?X-Amz-Signature=…",  // GET-only, 1-hour expiry
  "expiresIn": 3600,
  "expiresAt": "2026-09-04T08:00:00.000Z"
}
```

Download URLs are minted on demand and cached briefly server-side (see
`S3Service.signedUrlCache`); they are never stored or shipped inside list payloads.

---

## 5. Admin review queue

```
GET /api/v1/admin/booking-documents?status=Pending&bookingId=…&page=1&limit=20
```

Filters: `status` (`Pending|Verified|Rejected`), `bookingId`, `page` (default 1), `limit`
(default 20, max 100). Response: `{ data, total, page, limit }` where each item includes the
booking context (load/truck owners, addresses, booking status, EWB number) for review.

## 6. Admin verify / reject

```
PATCH /api/v1/admin/booking-documents/:documentId/verify
```

Body:

```jsonc
{ "status": "Verified", "notes": "POD matches delivery record" } // status: Verified | Rejected
```

Sets `verification_status`, `verified_by_id`, `verification_notes`, `verified_at`
(admin-only; mirrors the truck KYC flow at `/admin/documents/:id/verify`).

---

## Storage layout & configuration

Object keys: `booking-documents/<bookingId>/<STAGE>/<uuid>.<ext>`

| Env var | Used by `S3Service` | Default |
|---|---|---|
| `AWS_S3_BUCKET` | bucket | `lorrycarry-kyc` |
| `AWS_REGION` | region | `ap-south-1` |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | credentials | — |
| `AWS_S3_ENDPOINT` | MinIO endpoint (local) | unset → AWS |
| `AWS_S3_FORCE_PATH_STYLE` | `true` for MinIO | `false` |

For **browser** uploads (pre-signed PUT) to work, the bucket needs a CORS policy allowing
`PUT` from the web origin (`.env.example` dev setup uses MinIO on `localhost:9008`; the
docker-compose MinIO console policy covers local development).

> Frontend wiring: `apps/web/src/lib/api.ts` → `bookingDocumentsApi`; the chain card
> `DigitalDocumentChainCard` (booking detail page) implements the 3-step upload flow
> and on-demand downloads. Storage credentials never appear in client code.
