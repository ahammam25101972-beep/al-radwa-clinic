# Security Specification (`security_spec.md`)

## 1. Data Invariants
1. **Authentication & Verification Invariant**: Every read and write operation on `/Appointments/{appointmentId}` requires an authenticated user (`request.auth != null`) with a verified email (`request.auth.token.email_verified == true`).
2. **Ownership & PII Isolation Invariant**: Because `/Appointments/{appointmentId}` contains PII (`fullName`, `phone`), `get` and `list` operations are strictly restricted to the appointment owner (`resource.data.userId == request.auth.uid`) or a verified administrator (`isAdmin()`).
3. **Creation Integrity Invariant**: When creating an appointment, `incoming().userId` must equal `request.auth.uid`, `incoming().status` must be `'pending'`, and `incoming().createdAt` and `incoming().updatedAt` must equal `request.time`.
4. **Schema & Boundary Invariant**: Every string field enforces strict `.size()` and regex/enum constraints matching `firebase-blueprint.json`. Only allowed keys (`fullName`, `phone`, `serviceType`, `appointmentDate`, `appointmentTime`, `notes`, `status`, `userId`, `createdAt`, `updatedAt`) are permitted.
5. **Terminal State & Action-Based Update Invariant**: Once an appointment reaches a terminal status (`'completed'` or `'cancelled'`), non-admin users cannot modify it. Owners can only cancel (`status == 'cancelled'`) or reschedule (`appointmentDate`, `appointmentTime`, `notes`, `updatedAt`) while `existing().status == 'pending'`. Immutable fields (`userId`, `createdAt`) cannot be changed.

## 2. The "Dirty Dozen" Payloads

1. **Unauthenticated Write**: Creating an appointment with `auth = null`.
2. **Unverified Email Spoof**: Creating or reading an appointment with `email_verified = false`.
3. **Identity Spoofing on Create**: User `uid_A` creates an appointment with `userId: "uid_B"`.
4. **Shadow Field Injection on Create**: Payload includes an extra undeclared field `"isVIP": true`.
5. **Status Shortcutting on Create**: User creates an appointment directly with `status: "confirmed"` or `"completed"`.
6. **Client Timestamp Forgery**: User supplies a custom past/future timestamp instead of `request.time` for `createdAt` or `updatedAt`.
7. **Resource Poisoning (Oversized Name/Notes)**: User sends a 10KB string in `fullName` or `notes` or a 1.5KB junk document ID.
8. **Invalid Service Enum**: User submits `serviceType: "جراحة قلب"` (not in allowlist).
9. **Cross-Tenant PII Read**: Authenticated user `uid_B` attempts `get` or `list` on `uid_A`'s appointment.
10. **Immutable Field Mutation on Update**: Owner attempts to update `userId` or `createdAt`.
11. **Terminal State Re-opening**: Owner attempts to update an appointment whose `existing().status` is already `'cancelled'` or `'completed'`.
12. **Value Poisoning on Whitelisted Update Key**: Owner updates `status` with a boolean `true` or unauthorized status `'confirmed'`.
