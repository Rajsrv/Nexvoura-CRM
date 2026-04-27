# Security Specification - Dynamic Forms

## Data Invariants
1. `forms` can only be managed (create, update, delete) by users with `admin` or `manager` roles within the same company.
2. `forms` are associated with a `companyId`.
3. `formSubmissions` are public for creation (anyone can submit a lead form).
4. `formSubmissions` can only be read/managed by users in the same company.
5. Inactive forms should not allow submissions (though rules might be simpler to just check if `isActive` exists if we want to enforce it at the rule level, but `allow create` is usually for anyone).

## The "Dirty Dozen" Payloads (Deny Cases)
1. **Unauthorized Form Creation**: A `sales` user trying to create a form.
2. **Cross-Company Form Update**: Admin of Company A trying to update a form of Company B.
3. **Form Injection**: Trying to add a "Ghost Field" (e.g., `isVerified: true`) to a form.
4. **Invalid Field Type**: Setting a field type to `password` (not in enum).
5. **Missing Required Fields in Submission**: Submitting data without a `formId`.
6. **Submission Spoofing**: Setting `submittedAt` to a future date manually.
7. **Cross-Company Submission Read**: User of Company A reading submissions for Company B.
8. **Malicious ID in Form**: Using a 1MB string as a field ID.
9. **Unauthorized Form Deletion**: Non-admin user deleting a form.
10. **Schema Break (Form)**: Missing `fields` array when creating a form.
11. **Schema Break (Submission)**: Missing `data` object when submitting.
12. **Status Escalation**: Submitter trying to set status to `Converted`.

## Firestore Rules Logic (Draft)

### Forms
- `list`: if isSignedIn() && resource.data.companyId == getUserData(request.auth.uid).companyId
- `get`: if isSignedIn() && resource.data.companyId == getUserData(request.auth.uid).companyId
- `create`: if isSignedIn() && isAdmin() && incoming().companyId == getUserData(request.auth.uid).companyId
- `update`: if isSignedIn() && isAdmin() && incoming().companyId == existing().companyId && isValidForm(incoming())
- `delete`: if isSignedIn() && isAdmin() && resource.data.companyId == getUserData(request.auth.uid).companyId

### Submissions
- `list`: if isSignedIn() && resource.data.companyId == getUserData(request.auth.uid).companyId
- `get`: if isSignedIn() && resource.data.companyId == getUserData(request.auth.uid).companyId
- `create`: if isValidSubmission(incoming()) // Public access!
- `update`: if isSignedIn() && (isAdmin() || isManager()) && incoming().companyId == existing().companyId
- `delete`: if isSignedIn() && isAdmin() && resource.data.companyId == getUserData(request.auth.uid).companyId
