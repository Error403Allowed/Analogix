# Document Sharing Feature

## Overview

The document sharing feature allows users to share their documents with other users in two ways:

1. **Link-based sharing** - Generate a shareable URL that can be sent to anyone
2. **User-based sharing** - Share directly with specific Analogix users by searching their name

## Features

### Share Dialog

Access the share dialog by clicking the **Share** button in the document header when viewing any document.

#### Link Sharing
- Create shareable links with customizable permissions (view/edit)
- Set expiration dates (1 day, 1 week, 1 month, or never)
- Copy link to clipboard with one click
- Revoke access at any time
- Multiple active links can exist for the same document

#### User Sharing
- Search for other Analogix users by name
- Grant view or edit permissions
- Set expiration dates
- See list of all users the document is shared with
- Revoke access individually

### Shared with Me Page

Access via the **Shared with Me** button in the header (book icon) or navigate to `/shared-with-me`.

- View all documents shared with you by other users
- See permission level (view/edit) for each document
- See who shared each document
- Click to open and view/edit shared documents

### Access Control

- **View permission**: Can read the document but not edit
- **Edit permission**: Can make changes to the document (requires sign-in)
- **Link sharing**: Anyone with the link can access (view-only unless signed in)
- **User sharing**: Only the specific user can access

## Technical Implementation

### Database Schema

New `document_shares` table tracks all shares:
- `document_id`: The document being shared
- `subject_id`: The subject containing the document
- `owner_user_id`: The document owner
- `shared_with_user_id`: The recipient (null for link shares)
- `permission`: "view" or "edit"
- `expires_at`: Optional expiration timestamp
- `revoked`: Whether the share has been revoked

### API Endpoints

- `POST /api/shares/create` - Create a new share
- `GET /api/shares/list` - List shares (outgoing or incoming)
- `POST /api/shares/revoke` - Revoke a share
- `GET /api/shares/access/[shareId]` - Access document via share
- `GET /api/shares/user-search` - Search users for sharing
- `GET /api/shares/incoming` - Get documents shared with user

### Routes

- `/shared/[shareId]` - Public shared document view (link-based)
- `/shared-doc/[docId]/[subjectId]` - Shared document view (user-based)
- `/shared-with-me` - Dashboard for documents shared with user

### Security

- Row Level Security (RLS) policies enforce access control at database level
- Shares can be revoked at any time by the owner
- Expired shares automatically become inaccessible
- Authentication required for edit access

## Usage Examples

### Sharing a Document via Link

1. Open any document
2. Click the **Share** button in the header
3. Select "Share Link" tab
4. Choose permission (view/edit)
5. Set expiration (optional)
6. Click "Create Share Link"
7. Copy the generated URL and share it

### Sharing with a Specific User

1. Open any document
2. Click the **Share** button in the header
3. Select "Share with People" tab
4. Search for the user by name
5. Select the user from results
6. Choose permission and expiration
7. Click "Share with [User]"

### Viewing Shared Documents

1. Click the **Shared with Me** button in the header (book icon)
2. Browse documents others have shared with you
3. Click any document to open it
4. Edit if you have edit permission (must be signed in)

## Future Enhancements

Potential improvements for future versions:

- Email notifications when documents are shared
- Activity log showing who viewed/edited shared documents
- Share folders/subjects (not just individual documents)
- Public sharing with password protection
- Download permissions control
- Comment-only permission level
- Share analytics (views, edits, etc.)
