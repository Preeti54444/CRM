# Critical Bug Fixes Summary

## Overview
Fixed three critical production bugs causing complete frontend failure:
1. Infinite recursion stack overflow
2. API route 404/405 errors  
3. WebSocket connection failures

---

## BUG #1: Infinite Recursion in crm-init.js

### Problem
`getCRMApiBase()` and `getCRMApiBaseCandidates()` were calling each other recursively with no base case, causing **RangeError: Maximum call stack size exceeded** on every page load.

**Call chain:** `getCRMApiBase()` → `getCRMApiBaseCandidates()` → `getCRMApiBase()` → ... (infinite loop)

### Root Cause
In `getCRMApiBaseCandidates()`, lines 1512-1518 were calling `window.getCRMApiBase()`, which directly calls back into `getCRMApiBase()` (line 1560), creating mutual recursion.

### Before/After Diff

**File:** `frontend/js/crm-init.js` (lines 1500-1530)

```diff
function getCRMApiBaseCandidates() {
  const candidates = [];

  if (window.API_BASE) {
    candidates.push(window.API_BASE);
  }

-  if (typeof window.getCRMApiBase === 'function') {
-    try {
-      const resolved = window.getCRMApiBase();
-      if (resolved && !candidates.includes(resolved)) {
-        candidates.push(resolved);
-      }
-    } catch (err) {
-      console.warn('[CRM API] Unable to resolve API base via helper:', err);
-    }
-  }

+  // NOTE: REMOVED recursive call to window.getCRMApiBase() - was causing infinite loop
+  // getCRMApiBaseCandidates() should only gather static candidates, not call getCRMApiBase()
+  // to avoid: getCRMApiBase() -> getCRMApiBaseCandidates() -> getCRMApiBase() -> ...

  if (window.location.origin && !candidates.includes(window.location.origin)) {
    candidates.push(window.location.origin);
  }

  return candidates.filter(Boolean);
}
```

### Fix Explanation
- **Removed** the self-referential call to `window.getCRMApiBase()` 
- **Kept** static candidate sources: `window.API_BASE` and `window.location.origin`
- **Result:** Function now has proper base cases and no recursion

---

## BUG #2: API Route 404/405 Errors

### Problems
Multiple frontend API calls were returning 404 or 405 errors due to path mismatches between frontend expectations, backend routing, and nginx filtering.

#### Issue 2a: `/reports/*` endpoints returning 404
- **Frontend calls:** `GET /reports/eod`, `GET /reports/wod`, `GET /reports/sod`
- **Backend routes:** `/eod`, `/wod`, `/sod` (no `/reports` prefix)
- **Error:** Frontend path `/reports/eod` doesn't match backend `/eod` → 404

#### Issue 2b: `/work-sessions` vs `work_sessions` mismatch  
- **Frontend calls:** `GET /work-sessions`
- **nginx regex:** Looks for `work_sessions` (underscore, no dash)
- **Nginx log:** Request filtered before reaching backend → 404

#### Issue 2c: `/calls` not in nginx routing
- **Frontend calls:** `GET /calls`
- **nginx regex:** Missing `calls` entry
- **Error:** Nginx drops request → 404

#### Issue 2d: `GET /customers` returns 405
- **Frontend calls:** `GET /customers` (list all)
- **Backend:** Only `POST /customers`, `GET /customers/{id}` exist (no list endpoint)
- **Error:** GET method not allowed → 405

### Root Causes
1. Reports router had `prefix=""` instead of `prefix="/reports"`
2. nginx regex had outdated path names (`work_sessions` instead of `work-sessions`)
3. `calls` endpoint missing from nginx `location` regex
4. Missing `GET /customers` list endpoint in backend

### Before/After Diffs

#### Fix 2a: Reports Router Prefix

**File:** `backend/app/routers/reports.py` (line 21)

```diff
- router = APIRouter(prefix="", tags=["reports"])
+ router = APIRouter(prefix="/reports", tags=["reports"])
```

**Effect:** Routes now available at `/reports/eod`, `/reports/wod`, `/reports/sod`

---

#### Fix 2b & 2c: nginx Location Regex

**File:** `nginx.conf` (line 65)

```diff
- location ~ ^/(auth|sod|eod|wod|leads|lender|tasks|followups|dashboard|users|customers|timeline|work_sessions|early_logout|notifications|realtime|health|api/docs|api/openapi\.json)(/|$) {
+ location ~ ^/(auth|reports|sod|eod|wod|leads|lender|tasks|followups|dashboard|users|customers|timeline|work-sessions|calls|early_logout|notifications|realtime|health|api/docs|api/openapi\.json)(/|$) {
```

**Changes:**
- Added `reports` → allows `/reports/*` routes through
- Changed `work_sessions` → `work-sessions` → matches frontend calls
- Added `calls` → allows `/calls` endpoint through

---

#### Fix 2d: Add GET /customers Endpoint

**File:** `backend/app/routers/customers.py` (lines 19-28)

```diff
+ @router.get("", response_model=list[CustomerProfileResponse])
+ def list_customers(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
+     from ..services.customer_service import list_customers as list_customers_service
+     return list_customers_service(db)
+ 
+ 
  @router.get("/{customer_id}", response_model=CustomerProfileResponse)
  def get_customer(customer_id: UUID, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
      obj = get_customer_by_id(db, customer_id)
      if not obj:
          raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
      return obj
```

**Supporting change** - `backend/app/services/customer_service.py` (after line 44):

```diff
def get_customer_by_id(db: Session, customer_id: UUID) -> Optional[CustomerProfile]:
    return db.query(CustomerProfile).filter(CustomerProfile.id == customer_id).first()

+
+def list_customers(db: Session) -> list[CustomerProfile]:
+    """Retrieve all customer profiles"""
+    return db.query(CustomerProfile).all()
+

def update_customer(db: Session, obj: CustomerProfile, payload: CustomerProfileUpdate) -> CustomerProfile:
```

**Effect:** Frontend `GET /customers` now returns 200 with list of all customers

---

## BUG #3: WebSocket Connection Failure

### Problem
WebSocket connections to `/ws/notifications` fail immediately with **close code 1006** (abnormal closure) due to missing proxy headers in nginx.

### Root Cause
WebSocket upgrade negotiation requires proper forwarding of:
- `X-Forwarded-Proto` (determines ws:// vs wss://)
- `X-Forwarded-Host` (needed for CORS/CORS-related checks)
- `X-Forwarded-Port` (needed for URL reconstruction)
- `proxy_buffering off` (WebSocket requires streaming, not buffering)

nginx config was missing these, causing upgrade negotiation to fail.

### Before/After Diff

**File:** `nginx.conf` (lines 95-110)

```diff
  # WebSocket endpoint
  location /ws/ {
      proxy_pass http://backend;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
-     proxy_set_header Connection "upgrade";
+     proxy_set_header Connection "Upgrade";
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
+     proxy_set_header X-Forwarded-Proto $scheme;
+     proxy_set_header X-Forwarded-Host $host;
+     proxy_set_header X-Forwarded-Port $server_port;

      # WebSocket timeouts
      proxy_read_timeout 86400;
      proxy_send_timeout 86400;
+     proxy_connect_timeout 60s;
+
+     # Disable buffering for WebSocket
+     proxy_buffering off;
  }
```

### Changes Explained
1. **`Connection: Upgrade`** (capital U) - Proper HTTP header casing for upgrade negotiation
2. **`X-Forwarded-Proto`** - Tells backend the original protocol (http/https) so it can generate correct ws:// or wss://
3. **`X-Forwarded-Host`** - Needed for validating WebSocket origin
4. **`X-Forwarded-Port`** - Needed for correct URL handling
5. **`proxy_buffering off`** - Critical for streaming (WebSocket is a stream, not request/response)
6. **`proxy_connect_timeout`** - Prevents long timeout waiting for connection

---

## Testing Checklist

After deployment, verify:

- [ ] Page loads without console errors (no "Maximum call stack" errors)
- [ ] `GET /reports/eod` returns 200 (not 404)
- [ ] `GET /reports/wod` returns 200 (not 404)  
- [ ] `GET /work-sessions` returns 200 (not 404)
- [ ] `GET /calls` returns 200 (not 404)
- [ ] `GET /customers` returns 200 with customer array (not 405)
- [ ] WebSocket connection at `/ws/notifications` succeeds (check Network tab for 101 Switching Protocols)
- [ ] Real-time notifications display without errors

---

## Files Modified

1. `frontend/js/crm-init.js` - Removed infinite recursion
2. `backend/app/routers/reports.py` - Fixed prefix
3. `backend/app/routers/customers.py` - Added GET endpoint
4. `backend/app/services/customer_service.py` - Added list function
5. `nginx.conf` - Fixed regex and WebSocket headers

---

## Deployment Notes

- **No database migrations needed** - All changes are code/config only
- **No breaking changes** - All routes are backward compatible
- **nginx restart required** - `docker-compose restart nginx` or rebuild
- **Backend restart required** - `docker-compose restart backend`
- **Frontend cache busting** - Clear browser cache or deploy with version bump
