# Return-load / backhaul API

## Routes and access

```http
GET /api/v1/matching/truck/:truckId/return-loads
Authorization: Bearer <access token>
```

`/matching/truck/:truckId/return-loads` is the canonical route inside the API's
existing `/api/v1` prefix. The previous
`/api/v1/matches/truck/:truckId/return-loads` remains an alias of the **same
handler**, with identical authorization, validation, ranking and masking. Other
`/matches` routes and mutations are unchanged.

- A valid JWT and a UUID truck ID are required.
- Only the truck's owner can use this endpoint. Missing and other operators'
  trucks both return `404`; GPS coordinates and booking history are not exposed
  across accounts. There is no administrator or subscription ownership bypass.
- Discovery itself does not require a subscription. Contact reveal does.
- Responses use `Cache-Control: private, no-store` because they contain
  user-specific entitlement and location data.
- This is read-only: it creates no matches, bookings, notifications or payments.

## Query parameters

| Parameter | Default | Valid values |
| --- | --- | --- |
| `radius` | **50 km** | Finite number from **1 to 50** inclusive; fractional radii are supported |
| `limit` | 10 | Integer from 1 to 50 |
| `minScore` | 0 | Finite composite rank score from 0 to 100 |
| `destinationLat` | none | Latitude from -90 to 90; requires `destinationLng` |
| `destinationLng` | none | Longitude from -180 to 180; requires `destinationLat` |

The radius is a **hard ceiling**, not a suggestion. Invalid values, blank strings,
repeated numeric parameters and partial coordinate pairs return `400`; the service
also validates internal callers. Zero is a valid coordinate and minimum score,
but not a valid radius. Oversized radii are rejected, not silently expanded or
clamped. A query-supplied `userId` does not affect the JWT-derived caller.

```bash
curl --get "$API_URL/api/v1/matching/truck/$TRUCK_ID/return-loads" \
  --header "Authorization: Bearer $ACCESS_TOKEN" \
  --data-urlencode 'radius=25' \
  --data-urlencode 'limit=5' \
  --data-urlencode 'minScore=70'
```

## Hub resolution

The service loads the real truck's capacity, body type, current coordinates,
verification status and preferred destinations. Search hub precedence is:

1. A valid explicit destination coordinate pair (used by the owner's booking
   detail page to plan freight from that particular trip's destination).
2. The **latest completed booking** for this truck and its current owner, ordered
   by `completedAt DESC NULLS LAST`, then `updatedAt DESC`, then booking ID.
   Confirmed, pending, in-transit and cancelled bookings do not displace it.
3. Valid `currentLat` / `currentLng` from the truck when the latest completed
   destination is absent or unusable.
4. `anchor.source = "unresolved"` with an actionable explanation and an empty
   opportunity list. **No load query runs without a coordinate hub.**

Preferred destination names contribute to corridor ranking. They do not enable
an unbounded city-name search: without geocoded coordinates, a corridor name
cannot prove that a pickup is within 50 km. Invalid/incomplete coordinates are
not mixed between the truck, booking and override.

## Discovery and distance semantics

- Candidates must have `status = Open`, valid pickup latitude/longitude, positive
  tonnage no greater than the real truck capacity, and a different posting owner
  from the truck operator.
- PostGIS `ST_DWithin` / `ST_Distance` use **spherical geographic proximity** in km.
  A load with numeric coordinates but no materialized `loading_point` is still
  discoverable: its point is constructed from those coordinates.
- If the PostGIS query is unavailable, a parameterized PostgreSQL Haversine
  query is used. It retains the owner/status/capacity/coordinate predicates,
  latitude prefilter and exact radius predicate. It handles the dateline and
  clamps floating-point trigonometric input to its valid domain.
- **Both paths filter by radius and order by pickup distance and load ID before
  limiting to the nearest 100 candidates.** They do not take the newest 100
  nationwide loads and filter afterwards. Results are checked again before
  invoking the shared engines; unknown distances never qualify.
- The measured pickup distance is passed unchanged to both match scoring and
  backhaul ranking. It is not recomputed as the shared, rounded `1.3 × Haversine`
  road estimate. The response keeps full pickup precision so rounding cannot put
  a pickup outside a requested fractional radius. UI displays may round it.
- The portable and PostGIS spherical calculations can differ slightly because
  of their Earth-radius constants. Neither path substitutes a road-routing API.
- If both queries fail, discovery returns `503`, **not** a successful empty feed.

The partial GiST expression index in
`20260904020000_add_return_load_proximity_index` supports the PostGIS pickup
expression, including numeric-coordinate-only records. Apply normal migrations
before deployment (`prisma migrate deploy` against the production schema).
That migration creates the index concurrently and must not be wrapped in an
explicit transaction. The portable fallback is for degraded operation, not a
replacement for an indexed PostGIS deployment at scale.

## Explainable ranking

The API reuses `evaluateBackhaulOpportunities` and
`rankReturnLoadOpportunities` from `@lorrycarry/shared`:

| Factor | Weight | Meaning |
| --- | ---: | --- |
| `matchScore` | 55 | Shared truck/load compatibility score |
| `pickupProximity` | 15 | Less empty running from the resolved hub to pickup |
| `payload` | 12 | Payload utilization within the truck's capacity |
| `bodyType` | 6 | Exact body type, then compatible Open/OpenBody, then mismatch |
| `rate` | 7 | Indicative offered freight against the shared benchmark |
| `corridor` | 5 | Alignment with the truck's declared preferred corridors |

The API enables the shared budget gate. A budget more than 15% below the lane
benchmark caps the underlying match score at 65 and receives no rate-factor
points. An unspecified budget is negotiable, not a rejection. The pricing API
and its formulas are unchanged.

Sort order is composite `rankScore DESC`, then shorter pickup distance, higher
match score and load ID. `rank` is 1-based. Capacity-overloaded freight is excluded;
body-type or budget mismatches can remain lower-ranked and carry explicit flags
and warnings. A high score is not a confirmed booking, guaranteed revenue, or a
probability of acceptance.

## Contact privacy

For this endpoint, contact access requires a subscription belonging to the
**requesting user**, with all of:

```text
status = active
startedAt <= now
expiresAt > now
```

Trial-only accounts, cancelled/expired/future-starting subscriptions and failed
subscription lookups leave contacts locked. This read does not grant or extend a
trial, convert a trial, or change any subscription policy on other endpoints.

Locked discovery queries do not select or join shipper contact records. The DTO
is an explicit allowlist rather than a spread of database rows. Even if an
internal candidate contains contact fields, they cannot leak as `ownerPhone`,
`ownerName`, nested `user` objects or unlisted columns in the response:

```json
{
  "locked": true,
  "name": null,
  "phone": null,
  "message": "An active subscription is required to reveal shipper contact details."
}
```

Unlocked contacts have `locked: false`, a nullable `name` and nullable `phone`.
Clients must honor `contact.locked`, not infer access from local trial banners or
cached account state.

## Response contract

Top-level fields:

- `truck`: the owned truck summary, including actual GPS and preferred corridors.
- `anchor`: `{ source, label, detail, lat, lng }`, optionally `bookingId`,
  `bookingStatus`, `droppedAt` for a completed booking destination.
- `radiusKm`: validated effective proximity radius.
- `candidatesEvaluated`: number of nearby eligible candidates scored, at most 100.
- `totalRanked`: number passing `minScore` **before** the requested response limit.
  It is bounded by the candidate pool, **not** a count of all open loads.
- `contactUnlocked`, `generatedAt`, `disclaimer`, `opportunities`.

Each opportunity contains the load ID, rank, composite score and six
`rankFactors`; the full `matchResult`; route addresses; tonnage/body type;
indicative freight/benchmark and their ratio; measured pickup distance; potential
empty-run reduction estimate; payload/body/budget/corridor flags; urgency/posted
time; the gated `contact` object; and a confirmation disclaimer. It contains no
raw shipper record.

Status codes:

| Status | Meaning |
| --- | --- |
| 200 | Opportunities, a genuine empty result, or an explicitly unresolved hub |
| 400 | Invalid UUID/query/radius/limit/score/coordinate pair |
| 401 | Missing, invalid or expired authentication |
| 404 | Truck missing or not owned by the caller |
| 503 | Both spatial discovery queries unavailable |

## Web consumers

- `UnifiedDashboard` renders `ReturnLoadsPanel` for truck drivers. It defaults to
  the first verified owned truck (otherwise the first owned truck), offers a
  fleet selector and 10/25/50 km radius choices, and displays the top three
  server-ranked opportunities with factor explanations and compatibility warnings.
- Loading, empty-fleet, missing-hub, empty-result and request-failure states are
  distinct. Refresh/retry is explicit. Truck/radius changes abort prior requests
  and suppress stale results and contacts.
- The booking page requests discovery only for the truck owner, independently
  of booking/payment/document actions. A valid trip destination is supplied as
  a coordinate pair. A failure does not substitute a sample truck or city.
- Return-load assistant questions use the owned truck endpoint, report the
  recorded hub, and explain that cities in natural-language questions are not
  automatically geocoded. Failures/no owned truck do not fall through to local
  recommendations. Other assistant operations are unchanged.
- Shared opportunity cards use the API's contact decision for subscription or
  phone links; the previous no-op assistant card action is now a real link.

## Verification

With dependencies installed and database/shared workspace types built:

```bash
npm run build --workspace=@lorrycarry/database
npm run build --workspace=@lorrycarry/shared
npm test --workspace=@lorrycarry/api -- --runInBand matching
npm test --workspace=@lorrycarry/shared -- --runInBand matchingEngine returnLoadEngine
npm test --workspace=@lorrycarry/web -- --runInBand ReturnLoadsPanel returnLoadsApi returnLoadAssistant ReturnLoadOpportunityCard
```

Coverage includes real Nest HTTP routing/JWT guards/query validation (canonical
and alias routes), service ownership and hub selection, hard radius boundaries,
zero coordinates, bounded SQL/fallback construction, stable shared ranking,
budget/body/payload flags, contact masking/fail-closed behavior, dashboard
selection/cancellation/error states, assistant fallbacks, and client URL/parameter
contracts. Unit tests mock database calls; production migrations and PostGIS
query plans should also be exercised against the deployment's PostgreSQL/PostGIS
version.
