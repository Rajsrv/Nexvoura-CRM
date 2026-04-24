# Security Specification - Real-Time Chat

## Data Invariants
1. A message cannot exist without a valid conversation ID that the user is a member of.
2. Direct conversations must have exactly 2 members.
3. Users can only update their own presence status and lastSeen.
4. Users can only read conversations they are members of.

## The "Dirty Dozen" Payloads

### 1. Unauthorized Read (Identity Leak)
Attempt to read a conversation where the user is NOT a member.
```json
{ "op": "get", "path": "/conversations/another_users_conv", "auth": { "uid": "malicious_user" } }
```
**Expected**: PERMISSION_DENIED

### 2. Message Injection (Orphaned Write)
Attempt to send a message to a conversation the user is not in.
```json
{ "op": "create", "path": "/conversations/conv123/messages/msg1", "auth": { "uid": "malicious_user" }, "data": { "content": "I am not here", "senderId": "malicious_user", "conversationId": "conv123" } }
```
**Expected**: PERMISSION_DENIED

### 3. Identity Spoofing (Sender ID)
Attempt to send a message as another user.
```json
{ "op": "create", "path": "/conversations/conv123/messages/msg1", "auth": { "uid": "userA" }, "data": { "content": "Fake message", "senderId": "userB", "conversationId": "conv123" } }
```
**Expected**: PERMISSION_DENIED

### 4. Group Privilege Escalation
A non-admin attempting to add members to a group chat.
```json
{ "op": "update", "path": "/conversations/group1", "auth": { "uid": "regular_user" }, "data": { "memberIds": ["user1", "user2", "hacker"] } }
```
**Expected**: PERMISSION_DENIED

### 5. Presence Hijacking
Attempting to update another user's status.
```json
{ "op": "update", "path": "/userPresence/victimId", "auth": { "uid": "attackerId" }, "data": { "status": "offline" } }
```
**Expected**: PERMISSION_DENIED

### 6. PII Leak (Presence)
Attempting to read presence of a user in a different company.
```json
{ "op": "get", "path": "/userPresence/otherCompanyUser", "auth": { "uid": "userCompanyA" } }
```
**Expected**: PERMISSION_DENIED

### 7. Large Data Injection (Denial of Wallet)
Sending a 1MB message string.
```json
{ "op": "create", "path": "/conversations/conv123/messages/msg1", "auth": { "uid": "userA" }, "data": { "content": "VERY_LONG_STRING...", "senderId": "userA", "conversationId": "conv123" } }
```
**Expected**: PERMISSION_DENIED (Size check)

### 8. Message Threading Bypass
Attempting to set a `threadId` to a message in a different conversation.
*(Actually, we should validate threadId exists if provided)*
**Expected**: PERMISSION_DENIED

### 9. Illegal Conversation Creation (Direct)
Creating a direct conversation with 3 members.
**Expected**: PERMISSION_DENIED

### 10. Fake Notification (Message)
A user creating a "new_message" notification for themselves but manually.
**Expected**: PERMISSION_DENIED (Only server or valid sender should trigger related flow)

### 11. Overwriting Immutable Fields
Attempting to change `createdBy` in a conversation.
**Expected**: PERMISSION_DENIED

### 12. List Query Scraping
Attempting to list all conversations in the system without memberId filter.
**Expected**: PERMISSION_DENIED

## Test Runner (Expectations)
The `firestore.rules.test.ts` should verify that:
1. `allow list: if isSignedIn() && request.auth.uid in resource.data.memberIds` is enforced.
2. `allow update: if request.auth.uid == userId` for presence.
3. `isValidChatMessage` checks content size and senderId.
