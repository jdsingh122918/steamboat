# Steamboat Bachelor Party Website - Requirements Document

## Project Overview
A mobile-first static website for a bachelor party in Steamboat, Colorado. The site helps attendees track expenses, split costs, share photos/videos, and manage the trip itinerary.

---

## General Information
- **Event Location**: Steamboat, Colorado
- **Group Size**: 10-20 people
- **Timeline**: 1-3 months away
- **Total Budget Range**: $5,000 - $15,000
- **Site Administrator**: Best man only (single admin)
- **Website Duration**: Until trip ends

---

## Core Features

### 1. User Authentication & Access
- **Access Method**: Invite links only (unique URLs per person)
- **Privacy**: Full names visible for attendees
- **Admin Capabilities**:
  - Can revoke individual attendee access
  - Single admin (best man) manages site

### 2. Expense Tracking & Finance Management

#### Expense Categories
- All categories tracked (lodging, transport, activities, dining, etc.)

#### Split Method
- **Per-item opt-in**: People only pay for activities they join
- **No deposit system**: Pay as you go

#### Smart Finance Features
- Auto-split calculator (automatically calculate who owes what based on opt-ins)
- Expense visualization (charts showing spending breakdown by category)
- Balance optimization (minimize number of transactions to settle up)
- Simple settle-up list showing who owes whom

#### Expense Entry
- **Anyone can add** expenses (collaborative tracking)
- **Receipts required** - must attach receipt/proof for each expense
- Linked to activities/itinerary

#### Finance Visibility
- **Full transparency** - everyone sees all expenses and balances

### 3. Payment Integration

#### Approach
- **Deep links only** - Generate Venmo/PayPal/CashApp/Zelle links that open the native app
- No direct API integration (not practical for personal use)
- Track payment status manually (mark as paid when settled)

#### Supported Payment Apps
- Venmo
- PayPal
- CashApp
- Zelle

#### User Payment Profiles
- **Optional** - attendees can add their payment handles (Venmo username, etc.)

### 4. Photo & Video Sharing

#### Organization
- **Both by day/event AND by person** - multiple organization options

#### Expected Volume
- Moderate (100-500 items)

#### Upload Methods
- Drag & drop + gallery select
- Camera capture + gallery selection on mobile

#### Video Limits
- Maximum file size: 100MB per video

#### Privacy
- **Full access** - anyone with link can view/download

### 5. Itinerary & Activities

#### Schedule Feature
- **Detailed itinerary** with times, locations, activities

#### Activity-Expense Link
- Activities linked to their expense entries (click activity to see cost and who's in)

#### RSVP System
- **Per-activity RSVP tracking** - track who's joining each event

### 6. Communication
- **No in-app chat** - use external apps (text, WhatsApp, etc.)
- No comments feature

---

## Technical Requirements

### Hosting & Infrastructure
- **Hosting**: Vercel (free tier)
- **Database**: MongoDB (via Vercel integration)
- **Media Storage**: Cloudinary (free tier)

### Frontend
- **Framework**: Next.js (React-based)
- **Design**: Clean/Minimal theme
- **Mobile-first**: Primary design target

### Mobile UX
- Navigation menu (no floating action buttons)
- Responsive design for all screen sizes
- Multiple upload methods for photos/videos

### Offline Support
- **No offline mode required** - online only

### Notifications
- **No push notifications** - users check manually

---

## Security Requirements

### Access Control
- Invite link authentication
- Admin can revoke individual access
- No public access (obscure URLs only)

### Data Privacy
- Full names visible to group members
- Financial data fully transparent within group
- Media accessible to all group members

---

## Data Model (High-Level)

### Entities
1. **Attendees**
   - Name, email, invite token
   - Optional payment handles (Venmo, PayPal, Zelle, CashApp)
   - Access status (active/revoked)

2. **Expenses**
   - Description, amount, category
   - Paid by (attendee reference)
   - Split among (array of attendee references with opt-in status)
   - Receipt/proof attachment (required)
   - Linked activity (optional)
   - Created date, status

3. **Activities/Itinerary**
   - Name, description
   - Date/time, location
   - RSVP list (attendees who opted in)
   - Linked expense (optional)

4. **Media (Photos/Videos)**
   - File URL, type (photo/video)
   - Uploaded by (attendee reference)
   - Day/date tagged
   - File size

5. **Payments**
   - From (attendee), To (attendee)
   - Amount
   - Status (pending/paid)
   - Payment method used

---

## Page Structure

1. **Home/Dashboard**
   - Trip overview, countdown
   - Quick stats (total expenses, your balance)

2. **Itinerary**
   - Day-by-day schedule
   - Activity details with RSVP
   - Linked expenses per activity

3. **Finances**
   - Expense list with filters
   - Add expense form
   - Balance summary per person
   - Settle-up recommendations
   - Payment deep links

4. **Gallery**
   - Photo/video grid
   - Filter by day or person
   - Upload interface

5. **Attendees**
   - List of all attendees
   - Payment profile info
   - Admin: manage access

---

## API Research Summary

### Payment Integration Findings
Based on research, direct P2P payment APIs have significant limitations:

- **Venmo API**: OAuth API exists but cannot be used for merchant/business payments. New integrations no longer available.
- **Zelle**: Bank-integrated, no public API for custom apps
- **Apple Pay/Google Pay**: Require merchant accounts for payment processing

### Recommended Approach
Use **deep links** to open payment apps with pre-filled information:
- Venmo: `venmo://paycharge?txn=pay&recipients=USERNAME&amount=XX&note=DESCRIPTION`
- PayPal: `https://paypal.me/USERNAME/AMOUNT`
- CashApp: `https://cash.app/$CASHTAG/AMOUNT`

This approach:
- Works without API integration
- Opens native apps for secure transactions
- Tracks payment intent in our database
- Requires manual marking as "paid"

---

## Additional Requirements (Clarified)

### Data Export
- **Export capability**: Yes - allow downloading expense reports (CSV, PDF summary)

### Expense Disputes
- **Dispute handling**: Request review - flag expenses for admin to review
- Users can request admin review if they believe they shouldn't be included

### Currency
- **Single currency**: USD only

### Expense Editing
- **Edit permissions**: Editable by creator (person who added the expense)
- Creator can modify their own expenses after submission

### Trip Recap
- **Auto-generated recap**: Yes - create memory page with stats and highlights after event ends
- Include: total expenses, photos uploaded, activities completed, participant stats

### Browser Support
- **Modern browsers only**: Chrome, Safari, Firefox, Edge (latest 2 versions)
- No IE11 or legacy browser support required

### Invite Expiration
- **Custom expiration**: Admin can set per invite
- **Default**: 14 days
- Admin can extend or revoke manually

### Attendee Limits
- **No hard limit**: Flexible scaling for any group size

### Expense Search
- **Full search + filters**: Search by expense name, filter by category/person/date
- Comprehensive filtering for expense list

### Gamification
- **Stats without rankings**: Show fun stats (most photos, most expenses covered) but no competitive leaderboards
- Keep it friendly, not competitive

### Groom Exemption
- **Partial exemption**: Groom can be exempted from specific expense categories
- Admin can configure which categories the groom is auto-excluded from

### Invite Delivery
- **Both options**: Email invite + manual link sharing
- Admin can send via email or copy link to share via text/WhatsApp

### Data Retention
- **Permanent**: Data retained until manually deleted by admin
- No auto-deletion after trip ends

### Analytics
- **Admin dashboard only**: Usage stats visible only to admin
- Track page views, feature usage for admin insights

### Timezone Handling
- **User's local time**: Convert activity times to each user's timezone
- Store times in UTC, display in user's local timezone

### Help Section
- **None**: Keep interface simple and self-explanatory
- No FAQ or help documentation needed

### Admin Transfer
- **Transferable**: Admin can assign another person as backup/new admin
- Allows continuity if best man becomes unavailable

### Dark Mode
- **Toggle option**: User can switch between light and dark themes
- Preference saved per user

### Shareable Links
- **Yes**: Generate shareable links to specific photos/expenses
- Links still require group membership to view

### Photo Captions & Tags
- **Captions + tags**: Photos support text descriptions and searchable tags
- Tags enable filtering and search in gallery

### Voting/Polls
- **Yes**: Create polls for group decisions on activities
- Multiple choice voting with results visible to all

### Maps Integration
- **External links**: Link to Google Maps for directions
- No embedded maps, keep it simple

### Checklists
- **None**: No packing list or trip checklist feature needed

### Rate Limiting
- **None**: Trust the group, no spam prevention needed

### Content Recovery
- **30-day soft delete**: Deleted items recoverable for 30 days
- Admin can permanently delete or restore

### Bulk Download
- **Zip download**: Download all/selected photos as zip file
- Individual download also available

### Default Landing Page
- **Dashboard/Home**: Overview with stats and recent activity after login

### Smart Expense Splitting
- **Balance-aware automation**: System factors in existing balances when calculating splits
- Minimizes number of transactions needed to settle up
- Shows optimized "who pays whom" recommendations

### List Sorting
- **Multiple sort options**: Sort by date, amount, category, person
- Applies to expenses and gallery lists

### Activity Categories
- **Yes**: Categorize activities (Skiing, Dining, Nightlife, Adventure, etc.)
- Enables filtering itinerary by activity type

### Session Length
- **Session-based**: Stay logged in until browser is closed
- No persistent login across browser restarts

### Profile Pictures
- **Custom upload**: Users can upload their own profile pictures
- Displayed in avatars throughout the app

### Trip Banner
- **Custom banner**: Admin can upload header/banner image for the trip
- Displayed on dashboard and shared links

### Keyboard Shortcuts
- **None**: Mouse/touch navigation only, no keyboard shortcuts

### Print View
- **Print-optimized**: Clean print layout for expense reports
- Separate from PDF export, browser print-friendly

### Form Auto-Save
- **Yes**: Auto-save drafts as user types to prevent data loss
- Restore drafts on return to form

---

## Outstanding Items (To Be Provided Later)
- Groom's name (for website header/branding)
- Trip dates
- List of initial attendees/invitees

---

## Summary of Key Decisions

| Feature | Decision |
|---------|----------|
| Authentication | Invite links |
| Expense Split | Per-item opt-in |
| Receipts | Required |
| Payment Integration | Deep links only |
| Photo Organization | By day + by person |
| Itinerary | Detailed, linked to expenses |
| RSVP | Per-activity tracking |
| Settle-up | Simple list (not optimized) |
| Frontend | Next.js |
| Database | MongoDB via Vercel |
| Design | Clean/Minimal |
| Notifications | None |
| Chat | None |
| Data Export | CSV/PDF reports |
| Disputes | Admin review system |
| Currency | USD only |
| Expense Editing | Creator can edit |
| Trip Recap | Auto-generated |
| Browser Support | Modern only |
| Invite Expiry | 14 days default, customizable |
| Max Attendees | No hard limit |
| Expense Search | Full search + filters |
| Gamification | Stats without rankings |
| Groom Exemption | Partial (by category) |
| Invite Delivery | Email + manual link |
| Data Retention | Permanent (manual delete) |
| Analytics | Admin dashboard only |
| Timezone | User's local time |
| Help Section | None (self-explanatory) |
| Admin Transfer | Transferable to backup |
| Dark Mode | Toggle option |
| Shareable Links | Yes (within group) |
| Photo Captions | Captions + tags |
| Voting/Polls | Yes |
| Maps | Google Maps links |
| Checklists | None |
| Rate Limiting | None (trusted group) |
| Content Recovery | 30-day soft delete |
| Bulk Download | Zip download |
| Landing Page | Dashboard/Home |
| Smart Splitting | Balance-aware automation |
| List Sorting | Multiple options |
| Activity Categories | Yes (Skiing, Dining, etc.) |
| Session Length | Until browser closed |
| Profile Pictures | Custom upload |
| Trip Banner | Custom banner |
| Keyboard Shortcuts | None |
| Print View | Print-optimized |
