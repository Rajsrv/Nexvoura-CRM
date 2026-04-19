# Security Specification: Nexvoura CRM

## Data Invariants
1. **Company Isolation**: All data (except specific multi-tenant entities if any) MUST be isolated by `companyId`. A user can only access data belonging to their own company.
2. **Identity Integrity**: For sensitive operations (check-in, personal profile update), the `employeeId` or `userId` in the data MUST match the authenticated user's `uid`.
3. **RBAC Hierarchy**:
    - **Admin**: Full read/write access to all company data.
    - **Manager**: Full read access to company-wide employee data, write access to non-sensitive fields.
    - **Employee**: Read access to personal record ONLY. No access to other employees' attendance, salary, or documents.
4. **Immutability**: `createdAt`, `companyId`, and `employeeId` (in personal records) must be immutable after creation.
5. **Terminal State Locking**: Once an exit record is "Settled", it cannot be modified by non-admins.

## The "Dirty Dozen" Payloads (Test Scenarios)

| ID | Scenario | Payload (Partial) | Target Path | Expected |
|:---|:---|:---|:---|:---|
| 1 | **ID Spoofing** | `{ "employeeId": "other_user_id" }` | `/attendance/new` | `DENIED` |
| 2 | **Company Cross-over** | `{ "companyId": "comp_B" }` | `/users/me` (Auth: comp_A) | `DENIED` |
| 3 | **Salary Peek** | `get()` | `/users/other_employee` | `DENIED` |
| 4 | **Admin Escalation** | `{ "role": "admin" }` | `/users/me` (Update) | `DENIED` |
| 5 | **System Field Injection**| `{ "internalRating": 5 }` | `/performanceReviews/review` | `DENIED` |
| 6 | **Orphan Creation** | `{ "companyId": "non_existent" }` | `/leads/lead1` | `DENIED` |
| 7 | **Ghost Update** | `{ "extra": "poison" }` | `/users/me` (Update) | `DENIED` (hasOnly) |
| 8 | **Terminal Bypass** | `{ "status": "Pending" }` | `/exitRecords/settled_id` | `DENIED` |
| 9 | **Blanket List** | `query(collection('payroll'))` | `/payroll` (Non-admin) | `DENIED` |
| 10 | **Timestamp Fraud** | `{ "createdAt": "2000-01-01" }` | `/attendance/new` | `DENIED` |
| 11 | **ID Poisoning** | `get()` | `/users/very-long-id-128kb...` | `DENIED` |
| 12 | **Unverified Access** | `get()` | `/any/path` (email_verified: false) | `DENIED` |

## Proposed Hardened Rules Strategy

### Helpers
```javascript
function isAdmin() { return isSignedIn() && getUserData(request.auth.uid).role == 'admin'; }
function isManager() { return isSignedIn() && getUserData(request.auth.uid).role == 'manager'; }
function isManagement() { return isAdmin() || isManager(); }
function isOwner(data) { return isSignedIn() && data.employeeId == request.auth.uid; }
function isSelf(userId) { return isSignedIn() && userId == request.auth.uid; }
function isVerified() { return request.auth.token.email_verified == true; }
```

### Constraints
- `isValidUser`: Check all fields + immutable `companyId`.
- `affectedKeys().hasOnly()` for distinct actions (Update Role vs Update Bio).

village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village village'
