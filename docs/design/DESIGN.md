# Steamboat Bachelor Party - Design Document

## Table of Contents
1. [Overview](#overview)
2. [Design Principles](#design-principles)
3. [Color Palette](#color-palette)
4. [Typography](#typography)
5. [Spacing & Layout System](#spacing--layout-system)
6. [Navigation Patterns](#navigation-patterns)
7. [Page Designs](#page-designs)
8. [Component Library](#component-library)
9. [Interaction Patterns](#interaction-patterns)
10. [Accessibility Guidelines](#accessibility-guidelines)
11. [Technical Considerations](#technical-considerations)

---

## Overview

### Project Summary
A mobile-first web application for coordinating a bachelor party in Steamboat, Colorado. The app serves 10-20 attendees with features for expense tracking (per-item opt-in splitting), photo/video gallery, detailed itinerary with RSVP functionality, and integrated payment deep links.

### Target Users
- Primary: Mobile users (iOS/Android browsers)
- Secondary: Desktop users for detailed financial review
- User roles: Attendees (standard) and Admins (elevated permissions)

### Key Constraints
- Invite-link only authentication (no public registration)
- No floating action buttons (use navigation menu instead)
- No notifications or chat features
- Required receipt upload for all expenses
- 100MB max video file size
- Expected 100-500 gallery items

---

## Design Principles

### 1. Clean & Minimal
- Generous whitespace to reduce cognitive load
- Limited color palette with purposeful accent usage
- Typography-driven hierarchy
- Remove unnecessary decorative elements

### 2. Mobile-First
- Design for 375px width first, then scale up
- Touch-friendly tap targets (minimum 44x44px)
- Single-column layouts on mobile
- Thumb-zone optimized interactions

### 3. Clarity Over Cleverness
- Obvious navigation and actions
- Clear labeling without jargon
- Predictable patterns throughout
- Progressive disclosure for complex features

### 4. Financial Transparency
- Always show running balances
- Clear visualization of who owes whom
- One-tap access to settle up
- Receipt verification for trust

---

## Color Palette

### Primary Colors
```
Background Primary:    #FFFFFF (White)
Background Secondary:  #F8F9FA (Light Gray)
Background Tertiary:   #F1F3F5 (Subtle Gray)
```

### Text Colors
```
Text Primary:          #212529 (Near Black)
Text Secondary:        #6C757D (Medium Gray)
Text Tertiary:         #ADB5BD (Light Gray)
Text Inverse:          #FFFFFF (White)
```

### Accent Colors
```
Accent Primary:        #2563EB (Blue) - Primary actions, links
Accent Success:        #059669 (Green) - Confirmations, positive balances
Accent Warning:        #D97706 (Amber) - Warnings, pending states
Accent Error:          #DC2626 (Red) - Errors, negative balances, deletions
```

### Semantic Colors
```
Balance Positive:      #059669 (Green) - Money owed to user
Balance Negative:      #DC2626 (Red) - User owes money
Balance Neutral:       #6C757D (Gray) - Settled up
```

### Payment Brand Colors (for deep links)
```
Venmo:                 #3D95CE
PayPal:                #003087
CashApp:               #00D632
Zelle:                 #6D1ED4
```

### Dark Mode (Required)
User toggle option between light/dark themes:
```
Background Primary:    #121212
Background Secondary:  #1E1E1E
Background Tertiary:   #2D2D2D
Text Primary:          #E4E4E4
Text Secondary:        #A0A0A0
Accent Primary:        #60A5FA (lighter blue for dark mode)
Border Color:          #374151
```
- Theme preference saved per user in local storage
- Toggle in settings/profile area
- Respects system preference as default

---

## Typography

### Font Stack
```css
--font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--font-mono: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
```

### Type Scale
```
Display:      32px / 40px line-height / -0.02em tracking / Bold (700)
Heading 1:    24px / 32px line-height / -0.01em tracking / Semibold (600)
Heading 2:    20px / 28px line-height / -0.01em tracking / Semibold (600)
Heading 3:    16px / 24px line-height / Normal tracking / Semibold (600)
Body:         16px / 24px line-height / Normal tracking / Regular (400)
Body Small:   14px / 20px line-height / Normal tracking / Regular (400)
Caption:      12px / 16px line-height / 0.01em tracking / Regular (400)
Label:        14px / 20px line-height / 0.02em tracking / Medium (500)
```

### Usage Guidelines
- **Display**: Countdown timer, hero numbers
- **Heading 1**: Page titles
- **Heading 2**: Section headers
- **Heading 3**: Card titles, list headers
- **Body**: Primary content
- **Body Small**: Secondary descriptions
- **Caption**: Timestamps, metadata
- **Label**: Form labels, button text

---

## Spacing & Layout System

### Spacing Scale (8px base)
```
--space-1:   4px   (tight gaps)
--space-2:   8px   (related elements)
--space-3:   12px  (default gap)
--space-4:   16px  (section padding)
--space-5:   24px  (card padding)
--space-6:   32px  (section margins)
--space-7:   48px  (page sections)
--space-8:   64px  (major divisions)
```

### Container Widths
```
Mobile:      100% with 16px horizontal padding
Tablet:      100% with 24px horizontal padding
Desktop:     max-width 1200px, centered
```

### Grid System
```
Mobile:      Single column
Tablet:      2 columns (gallery, attendees)
Desktop:     3-4 columns (gallery), sidebar + main content
```

### Border Radius
```
--radius-sm:   4px  (buttons, inputs)
--radius-md:   8px  (cards, modals)
--radius-lg:   12px (large cards, images)
--radius-full: 9999px (avatars, pills)
```

---

## Navigation Patterns

### Mobile Navigation (Bottom Tab Bar)

```
+--------------------------------------------------+
|                    [Content Area]                 |
|                                                   |
+--------------------------------------------------+
| [Home]  [Itinerary]  [Finances]  [Gallery] [More]|
+--------------------------------------------------+

Height: 64px + safe area inset
Icons: 24x24px with 12px label below
Active state: Accent Primary color + filled icon
Inactive state: Text Secondary + outlined icon
```

#### Navigation Items
1. **Home** - Dashboard icon
2. **Itinerary** - Calendar icon
3. **Finances** - Dollar sign icon
4. **Gallery** - Image icon
5. **More** - Menu icon (opens sheet with Attendees, Settings, Admin)

#### Behavior
- Fixed to bottom of viewport
- Respects safe area insets (notch, home indicator)
- Active tab has visual indicator (color change, not underline)
- Tapping active tab scrolls to top
- "More" opens bottom sheet with additional options

### Desktop Navigation (Sidebar)

```
+----------+----------------------------------------+
|  LOGO    |                                        |
|          |                                        |
| [Home]   |           [Content Area]               |
| [Itin]   |                                        |
| [Finance]|                                        |
| [Gallery]|                                        |
| [People] |                                        |
|          |                                        |
|----------|                                        |
| [Admin]  |                                        |
| [Logout] |                                        |
+----------+----------------------------------------+

Sidebar Width: 240px (collapsible to 64px icons-only)
```

#### Behavior
- Persistent sidebar on screens > 1024px
- Collapsible to icon-only mode
- Active state: Background highlight + accent color icon
- Admin section only visible to admin users

### Page Headers

```
Mobile:
+--------------------------------------------------+
|  Page Title                          [Action Btn] |
+--------------------------------------------------+

Desktop:
+--------------------------------------------------+
|  Page Title                                       |
|  Subtitle/description text               [Actions]|
+--------------------------------------------------+
```

---

## Page Designs

### 1. Home/Dashboard

#### Purpose
Central hub showing trip overview, personal financial summary, and recent activity.

#### Mobile Layout (375px)

```
+------------------------------------------+
|  STEAMBOAT 2025                          |
|  Bachelor Party                          |
+------------------------------------------+
|                                          |
|  +------------------------------------+  |
|  |         COUNTDOWN TIMER            |  |
|  |                                    |  |
|  |    12 DAYS  04 HRS  32 MIN        |  |
|  |                                    |  |
|  |    Feb 15-18, 2025                |  |
|  +------------------------------------+  |
|                                          |
|  +------------------------------------+  |
|  |  YOUR BALANCE                      |  |
|  |                                    |  |
|  |  -$245.50                         |  |
|  |  You owe 3 people                 |  |
|  |                                    |  |
|  |  [Settle Up]                      |  |
|  +------------------------------------+  |
|                                          |
|  +------------------------------------+  |
|  |  TRIP EXPENSES          $2,450.00 |  |
|  |  -------------------------------- |  |
|  |  Your Share             $312.50   |  |
|  |  Paid So Far            $67.00    |  |
|  +------------------------------------+  |
|                                          |
|  RECENT ACTIVITY                         |
|  +------------------------------------+  |
|  |  [Avatar] Mike added expense       |  |
|  |  Ski Rentals - $840.00            |  |
|  |  2 hours ago                      |  |
|  +------------------------------------+  |
|  +------------------------------------+  |
|  |  [Avatar] Sarah uploaded 12 photos |  |
|  |  Day 1 - Arrival                  |  |
|  |  Yesterday                        |  |
|  +------------------------------------+  |
|  +------------------------------------+  |
|  |  [Avatar] You RSVP'd Yes          |  |
|  |  Snowmobile Tour                  |  |
|  |  Yesterday                        |  |
|  +------------------------------------+  |
|                                          |
|  [View All Activity]                     |
|                                          |
+------------------------------------------+
```

#### Desktop Layout (1200px)

```
+------------------------------------------------------------------+
|  SIDEBAR  |                                                       |
|           |  STEAMBOAT 2025 - Bachelor Party                      |
|           |  Feb 15-18, 2025                                      |
|           |                                                       |
|           |  +----------------------+  +----------------------+   |
|           |  |   COUNTDOWN TIMER    |  |    YOUR BALANCE      |   |
|           |  |                      |  |                      |   |
|           |  |  12D  04H  32M  15S  |  |    -$245.50         |   |
|           |  |                      |  |    You owe 3 people  |   |
|           |  |                      |  |    [Settle Up]       |   |
|           |  +----------------------+  +----------------------+   |
|           |                                                       |
|           |  +----------------------+  +----------------------+   |
|           |  |   TRIP EXPENSES      |  |   QUICK STATS        |   |
|           |  |   $2,450.00 total    |  |   16 Attendees       |   |
|           |  |   Your: $312.50      |  |   24 Activities      |   |
|           |  |   Paid: $67.00       |  |   156 Photos         |   |
|           |  +----------------------+  +----------------------+   |
|           |                                                       |
|           |  RECENT ACTIVITY                                      |
|           |  +------------------------------------------------+  |
|           |  | [Avatar] | Mike added expense      | 2 hrs ago |  |
|           |  |          | Ski Rentals - $840.00   |           |  |
|           |  +------------------------------------------------+  |
|           |  | [Avatar] | Sarah uploaded photos   | Yesterday |  |
|           |  |          | 12 new photos - Day 1   |           |  |
|           |  +------------------------------------------------+  |
|           |                                                       |
+------------------------------------------------------------------+
```

#### Component Details

**Countdown Timer Card**
- Large display numbers with unit labels below
- Updates every second (or minute to save resources)
- Shows trip dates below countdown
- States: Counting down, Trip in progress ("Day 2 of 4"), Trip ended ("Memories Made")

**Balance Card**
- Large balance number (red if negative, green if positive)
- Summary text ("You owe X people" / "X people owe you")
- Primary CTA button to settle up
- Tap navigates to Finances page with settle-up section open

**Expense Summary Card**
- Total trip expenses (all attendees)
- User's calculated share
- Amount user has paid
- Visual progress indicator (optional)

**Activity Feed**
- Avatar + action description + timestamp
- Activity types: Expense added, Photo uploaded, RSVP changed, Payment made
- Grouped by day for readability
- "View All" loads full activity log

#### States

**Loading State**
- Skeleton placeholders for each card
- Pulse animation on skeletons

**Empty State (New Trip)**
- Countdown timer active
- Balance shows $0.00
- Activity feed: "No activity yet. Be the first to add an expense or photo!"

**Error State**
- Inline error message with retry button
- Cached data shown if available

---

### 2. Itinerary Page

#### Purpose
Day-by-day schedule with activity details, RSVP functionality, and linked expenses.

#### Mobile Layout (375px)

```
+------------------------------------------+
|  Itinerary                    [+ Add]    |
+------------------------------------------+
|                                          |
|  [Day 1] [Day 2] [Day 3] [Day 4]        |
|  ========                                |
|                                          |
|  FRIDAY, FEB 15                          |
|  Arrival Day                             |
|                                          |
|  +------------------------------------+  |
|  |  2:00 PM                          |  |
|  |  AIRPORT PICKUP                    |  |
|  |  Denver International Airport      |  |
|  |                                    |  |
|  |  Shuttle to Steamboat. Meet at    |  |
|  |  baggage claim Terminal West.     |  |
|  |                                    |  |
|  |  Going: 12/16  [Yes] [No] [Maybe] |  |
|  |                                    |  |
|  |  Linked: Shuttle - $320           |  |
|  +------------------------------------+  |
|                                          |
|  +------------------------------------+  |
|  |  6:00 PM                          |  |
|  |  CHECK-IN                          |  |
|  |  Mountain Lodge Resort             |  |
|  |  [Map]                            |  |
|  |                                    |  |
|  |  Check in at front desk. Rooms    |  |
|  |  assigned on arrival.             |  |
|  |                                    |  |
|  |  Going: 16/16  [Yes] [No] [Maybe] |  |
|  |                                    |  |
|  |  Linked: Lodging - $2,400         |  |
|  +------------------------------------+  |
|                                          |
|  +------------------------------------+  |
|  |  8:00 PM                          |  |
|  |  WELCOME DINNER                    |  |
|  |  The Steamboat Smokehouse         |  |
|  |  [Map] [Menu]                     |  |
|  |                                    |  |
|  |  Reservation under "Johnson"      |  |
|  |                                    |  |
|  |  Going: 14/16  [Yes] [No] [Maybe] |  |
|  +------------------------------------+  |
|                                          |
+------------------------------------------+
```

#### Desktop Layout (1200px)

```
+------------------------------------------------------------------+
|  SIDEBAR  |  Itinerary                             [+ Add Event]  |
|           |----------------------------------------------------- |
|           |                                                       |
|           |  [Day 1]  [Day 2]  [Day 3]  [Day 4]  [All Days]      |
|           |  ========                                             |
|           |                                                       |
|           |  +------------------------+  +---------------------+  |
|           |  | FRIDAY, FEB 15         |  | DAY SUMMARY         |  |
|           |  | Arrival Day            |  |                     |  |
|           |  |------------------------|  | 4 Activities        |  |
|           |  |                        |  | 14/16 Attending     |  |
|           |  | 2:00 PM                |  | $2,720 in expenses  |  |
|           |  | AIRPORT PICKUP         |  |                     |  |
|           |  | Denver International   |  +---------------------+  |
|           |  |                        |  |                     |  |
|           |  | [Full description...]  |  | WHO'S GOING         |  |
|           |  |                        |  | [Avatars of RSVPs]  |  |
|           |  | Going: 12/16           |  |                     |  |
|           |  | [Yes] [No] [Maybe]     |  | Not going: Mike, Tom|  |
|           |  |                        |  +---------------------+  |
|           |  | Linked: Shuttle $320   |  |                     |  |
|           |  +------------------------+  | LINKED EXPENSES     |  |
|           |  |                        |  | - Shuttle: $320     |  |
|           |  | 6:00 PM                |  | - Lodging: $2,400   |  |
|           |  | CHECK-IN               |  |                     |  |
|           |  | Mountain Lodge Resort  |  +---------------------+  |
|           |  | ...                    |                           |
|           |  +------------------------+                           |
+------------------------------------------------------------------+
```

#### Component Details

**Day Tab Selector**
- Horizontal scrollable tabs on mobile
- Fixed tabs on desktop
- Shows day number and short date
- Active tab highlighted with accent color
- "All Days" option on desktop for full view

**Activity Card**
```
+------------------------------------------+
|  [Time Badge]                            |
|  ACTIVITY TITLE                          |
|  Location Name                           |
|  [Map Link] [External Links...]          |
|                                          |
|  Description text that can span          |
|  multiple lines with full details...     |
|                                          |
|  +------------------------------------+  |
|  |  Going: 12/16                      |  |
|  |  [Yes]  [No]  [Maybe]              |  |
|  +------------------------------------+  |
|                                          |
|  [Expense Icon] Linked: Shuttle - $320   |
+------------------------------------------+
```

**RSVP Toggle Group**
- Three-state toggle: Yes / No / Maybe
- Current selection highlighted
- Shows count of each response
- Tapping updates immediately with optimistic UI
- Visual confirmation on change

**Linked Expense Badge**
- Shows expense name and amount
- Tappable to view full expense details
- Multiple expenses stack vertically
- "Add Expense" link if user is admin

#### States

**Loading State**
- Day tabs visible immediately
- Skeleton cards for activities

**Empty State (No Activities)**
- "No activities planned for this day yet"
- Admin sees "Add First Activity" button

**RSVP Loading State**
- Button shows spinner during submission
- Disabled state prevents double-tap

---

### 3. Finances Page

#### Purpose
Comprehensive expense tracking with per-item opt-in splitting, balance calculations, and settlement facilitation.

#### Mobile Layout (375px)

```
+------------------------------------------+
|  Finances                                |
+------------------------------------------+
|                                          |
|  [Expenses] [Balances] [Settle Up]       |
|  =========                               |
|                                          |
|  +------------------------------------+  |
|  |  YOUR BALANCE                      |  |
|  |                                    |  |
|  |  -$245.50                         |  |
|  |                                    |  |
|  |  [View Breakdown]                  |  |
|  +------------------------------------+  |
|                                          |
|  FILTER BY CATEGORY                      |
|  [All] [Lodging] [Food] [Activities]     |
|  [Transport] [Supplies] [Other]          |
|                                          |
|  +------------------------------------+  |
|  |  [+] ADD EXPENSE                   |  |
|  +------------------------------------+  |
|                                          |
|  RECENT EXPENSES                         |
|                                          |
|  +------------------------------------+  |
|  |  [Receipt]  Ski Rentals           |  |
|  |             $840.00                |  |
|  |             Paid by Mike          |  |
|  |             Feb 15 - Activities   |  |
|  |                                    |  |
|  |             Split: 12 people      |  |
|  |             Your share: $70.00    |  |
|  |                                    |  |
|  |  [You're In]        [Opt Out]     |  |
|  +------------------------------------+  |
|                                          |
|  +------------------------------------+  |
|  |  [Receipt]  Groceries             |  |
|  |             $156.00                |  |
|  |             Paid by Sarah         |  |
|  |             Feb 15 - Food         |  |
|  |                                    |  |
|  |             Split: 16 people      |  |
|  |             Your share: $9.75     |  |
|  |                                    |  |
|  |  [You're In]        [Opt Out]     |  |
|  +------------------------------------+  |
|                                          |
|  +------------------------------------+  |
|  |  [Receipt]  Welcome Dinner        |  |
|  |             $420.00                |  |
|  |             Paid by John          |  |
|  |             Feb 15 - Food         |  |
|  |                                    |  |
|  |             You opted out         |  |
|  |                                    |  |
|  |  [Opt In]          [Opted Out]    |  |
|  +------------------------------------+  |
|                                          |
+------------------------------------------+
```

#### Balances Tab - Mobile

```
+------------------------------------------+
|  Finances                                |
+------------------------------------------+
|                                          |
|  [Expenses] [Balances] [Settle Up]       |
|             =========                    |
|                                          |
|  +------------------------------------+  |
|  |  BALANCE SUMMARY                   |  |
|  |                                    |  |
|  |  Total Expenses:     $2,450.00    |  |
|  |  Your Share:         $312.50      |  |
|  |  You've Paid:        $67.00       |  |
|  |  -------------------------------- |  |
|  |  You Owe:            $245.50      |  |
|  +------------------------------------+  |
|                                          |
|  YOU OWE                                 |
|                                          |
|  +------------------------------------+  |
|  |  [Avatar]  Mike                    |  |
|  |            $150.00                 |  |
|  |            [Pay Now]              |  |
|  +------------------------------------+  |
|  +------------------------------------+  |
|  |  [Avatar]  Sarah                   |  |
|  |            $65.50                  |  |
|  |            [Pay Now]              |  |
|  +------------------------------------+  |
|  +------------------------------------+  |
|  |  [Avatar]  John                    |  |
|  |            $30.00                  |  |
|  |            [Pay Now]              |  |
|  +------------------------------------+  |
|                                          |
|  OWES YOU                                |
|                                          |
|  +------------------------------------+  |
|  |  [Avatar]  Tom                     |  |
|  |            $12.00                  |  |
|  |            [Request]              |  |
|  +------------------------------------+  |
|                                          |
+------------------------------------------+
```

#### Settle Up Tab - Mobile

```
+------------------------------------------+
|  Finances                                |
+------------------------------------------+
|                                          |
|  [Expenses] [Balances] [Settle Up]       |
|                        ==========        |
|                                          |
|  +------------------------------------+  |
|  |  SETTLE WITH MIKE                  |  |
|  |  You owe $150.00                   |  |
|  |                                    |  |
|  |  Pay via:                          |  |
|  |                                    |  |
|  |  +------------------------------+  |  |
|  |  | [Venmo]  @mike_johnson      |  |  |
|  |  +------------------------------+  |  |
|  |  +------------------------------+  |  |
|  |  | [PayPal] mike@email.com     |  |  |
|  |  +------------------------------+  |  |
|  |  +------------------------------+  |  |
|  |  | [CashApp] $MikeJ            |  |  |
|  |  +------------------------------+  |  |
|  |  +------------------------------+  |  |
|  |  | [Zelle]  555-123-4567       |  |  |
|  |  +------------------------------+  |  |
|  |                                    |  |
|  |  [Mark as Paid]                   |  |
|  +------------------------------------+  |
|                                          |
|  +------------------------------------+  |
|  |  SETTLE WITH SARAH                 |  |
|  |  You owe $65.50                    |  |
|  |  ...                               |  |
|  +------------------------------------+  |
|                                          |
+------------------------------------------+
```

#### Add Expense Form - Mobile (Full Screen)

```
+------------------------------------------+
|  [X Close]       Add Expense             |
+------------------------------------------+
|                                          |
|  RECEIPT PHOTO *                         |
|  +------------------------------------+  |
|  |                                    |  |
|  |     [Camera Icon]                  |  |
|  |                                    |  |
|  |     Take Photo or Upload          |  |
|  |                                    |  |
|  +------------------------------------+  |
|                                          |
|  EXPENSE NAME *                          |
|  +------------------------------------+  |
|  |  e.g., Ski Rentals                |  |
|  +------------------------------------+  |
|                                          |
|  AMOUNT *                                |
|  +------------------------------------+  |
|  |  $  0.00                          |  |
|  +------------------------------------+  |
|                                          |
|  CATEGORY *                              |
|  +------------------------------------+  |
|  |  Select category...          [v]  |  |
|  +------------------------------------+  |
|                                          |
|  DATE                                    |
|  +------------------------------------+  |
|  |  Feb 15, 2025                [v]  |  |
|  +------------------------------------+  |
|                                          |
|  PAID BY                                 |
|  +------------------------------------+  |
|  |  Me (default)                [v]  |  |
|  +------------------------------------+  |
|                                          |
|  LINK TO ACTIVITY (optional)             |
|  +------------------------------------+  |
|  |  None selected               [v]  |  |
|  +------------------------------------+  |
|                                          |
|  SPLIT OPTIONS                           |
|  +------------------------------------+  |
|  |  (o) Split equally - Everyone     |  |
|  |  ( ) Split equally - Select people|  |
|  |  ( ) Custom amounts               |  |
|  +------------------------------------+  |
|                                          |
|  NOTES (optional)                        |
|  +------------------------------------+  |
|  |                                    |  |
|  +------------------------------------+  |
|                                          |
|  +------------------------------------+  |
|  |          SAVE EXPENSE              |  |
|  +------------------------------------+  |
|                                          |
+------------------------------------------+
```

#### Desktop Layout (1200px)

```
+------------------------------------------------------------------+
|  SIDEBAR  |  Finances                                             |
|           |----------------------------------------------------- |
|           |                                                       |
|           |  +------------------+  +---------------------------+  |
|           |  | YOUR BALANCE     |  | EXPENSE CHART             |  |
|           |  |                  |  |                           |  |
|           |  | -$245.50        |  | [Pie chart by category]   |  |
|           |  |                  |  |                           |  |
|           |  | [Settle Up]      |  | Lodging: 45%              |  |
|           |  +------------------+  | Food: 25%                 |  |
|           |                        | Activities: 20%           |  |
|           |  +------------------+  | Transport: 10%            |  |
|           |  | FILTERS          |  +---------------------------+  |
|           |  |                  |                                 |
|           |  | Category: [All]  |  EXPENSES                       |
|           |  | Paid by: [All]   |  +---------------------------+  |
|           |  | Date: [All]      |  | [Table view with columns] |  |
|           |  +------------------+  | Receipt|Name|Amount|Cat|  |  |
|           |                        |        |    |Payer|Share|  |  |
|           |  +------------------+  |--------|----|----|-----|  |  |
|           |  | [+ ADD EXPENSE]  |  | [img]  |Ski |$840|Act  |  |  |
|           |  +------------------+  |        |    |Mike|$70  |  |  |
|           |                        | [img]  |Groc|$156|Food |  |  |
|           |                        |        |    |Sara|$9.75|  |  |
|           |                        +---------------------------+  |
+------------------------------------------------------------------+
```

#### Component Details

**Expense Card**
```
+------------------------------------------+
|  [Receipt    |  Expense Name             |
|   Thumbnail] |  $XXX.XX                  |
|              |  Paid by [Name]           |
|              |  [Date] - [Category]      |
|-----------------------------------------|
|  Split: X people | Your share: $XX.XX    |
|-----------------------------------------|
|  [You're In]              [Opt Out]      |
+------------------------------------------+
```

- Receipt thumbnail on left (tappable to view full)
- Expense details on right
- Split info showing participant count
- User's calculated share
- Opt-in/out toggle buttons
- Subtle background color change when opted out

**Opt-In/Out Toggle**
- Two-state toggle for each expense
- "You're In" (default) - user is part of split
- "Opted Out" - user excluded from split
- Changing state immediately recalculates shares
- Shows confirmation toast on change

**Balance Person Card**
```
+------------------------------------------+
|  [Avatar]  Name                          |
|            $XXX.XX                        |
|            [Pay Now] or [Request]         |
+------------------------------------------+
```

**Payment Method Button**
```
+------------------------------------------+
|  [Brand Icon]  Handle/Email/Phone        |
+------------------------------------------+
```
- Tapping opens deep link to payment app
- Falls back to copy-to-clipboard if app not installed
- Brand colors for recognition

**Expense Visualization (Desktop)**
- Pie chart showing category breakdown
- Bar chart showing expenses by day
- Toggle between chart types

#### Category Options
1. Lodging
2. Food & Drinks
3. Activities
4. Transportation
5. Supplies
6. Tips
7. Other

#### States

**Loading State**
- Balance card shows skeleton
- Expense list shows skeleton cards

**Empty State**
- "No expenses yet. Add the first expense to start tracking!"
- Prominent add expense button

**Form Validation**
- Receipt: Required, shows error if missing
- Name: Required, min 2 characters
- Amount: Required, must be > 0
- Category: Required selection

**Opt-Out Confirmation**
- "Opt out of this expense? Your share will be removed."
- [Cancel] [Opt Out]

---

### 4. Gallery Page

#### Purpose
Photo and video sharing with organized viewing, filtering, and easy upload.

#### Mobile Layout (375px)

```
+------------------------------------------+
|  Gallery                        [Upload] |
+------------------------------------------+
|                                          |
|  [All] [Day 1] [Day 2] [Day 3] [Day 4]  |
|  =====                                   |
|                                          |
|  +--------+  +--------+  +--------+     |
|  |        |  |        |  |        |     |
|  | Photo  |  | Photo  |  | Video  |     |
|  |   1    |  |   2    |  |   3    |     |
|  |        |  |        |  |  [>]   |     |
|  +--------+  +--------+  +--------+     |
|  +--------+  +--------+  +--------+     |
|  |        |  |        |  |        |     |
|  | Photo  |  | Photo  |  | Photo  |     |
|  |   4    |  |   5    |  |   6    |     |
|  |        |  |        |  |        |     |
|  +--------+  +--------+  +--------+     |
|  +--------+  +--------+  +--------+     |
|  |        |  |        |  |        |     |
|  | Photo  |  | Photo  |  | Video  |     |
|  |   7    |  |   8    |  |   9    |     |
|  |        |  |        |  |  [>]   |     |
|  +--------+  +--------+  +--------+     |
|                                          |
|  [Load More]                             |
|                                          |
+------------------------------------------+
```

#### Upload Interface - Mobile

```
+------------------------------------------+
|  [X Close]       Upload                  |
+------------------------------------------+
|                                          |
|  +------------------------------------+  |
|  |                                    |  |
|  |                                    |  |
|  |     [Cloud Upload Icon]           |  |
|  |                                    |  |
|  |     Tap to select files           |  |
|  |     or drag & drop                |  |
|  |                                    |  |
|  |     Photos & Videos               |  |
|  |     Max 100MB per video           |  |
|  |                                    |  |
|  +------------------------------------+  |
|                                          |
|  SELECT DAY                              |
|  +------------------------------------+  |
|  |  Day 1 - Feb 15               [v] |  |
|  +------------------------------------+  |
|                                          |
|  UPLOADING (3 of 8)                      |
|  +------------------------------------+  |
|  | [Thumb] IMG_001.jpg    [====  ] ✓ |  |
|  | [Thumb] IMG_002.jpg    [======]   |  |
|  | [Thumb] VID_003.mp4    [==    ]   |  |
|  | [Thumb] IMG_004.jpg    Waiting... |  |
|  +------------------------------------+  |
|                                          |
|  [Cancel All]                            |
|                                          |
+------------------------------------------+
```

#### Photo Viewer - Mobile (Full Screen)

```
+------------------------------------------+
|  [X]  3 of 156            [Download][...]|
+------------------------------------------+
|                                          |
|                                          |
|                                          |
|              [Full Photo]                |
|                                          |
|                                          |
|                                          |
+------------------------------------------+
|  [Avatar] Sarah                          |
|  Day 1 - Feb 15, 2:34 PM                |
+------------------------------------------+
|  [<]                               [>]   |
+------------------------------------------+
```

#### Desktop Layout (1200px)

```
+------------------------------------------------------------------+
|  SIDEBAR  |  Gallery                               [Upload Files] |
|           |----------------------------------------------------- |
|           |                                                       |
|           |  FILTER: [All Days v]  [All People v]  [Photos/Video]|
|           |                                                       |
|           |  +-------+ +-------+ +-------+ +-------+ +-------+   |
|           |  |       | |       | |       | |       | |       |   |
|           |  | Img 1 | | Img 2 | | Vid 3 | | Img 4 | | Img 5 |   |
|           |  |       | |       | |  [>]  | |       | |       |   |
|           |  +-------+ +-------+ +-------+ +-------+ +-------+   |
|           |  +-------+ +-------+ +-------+ +-------+ +-------+   |
|           |  |       | |       | |       | |       | |       |   |
|           |  | Img 6 | | Img 7 | | Img 8 | | Vid 9 | | Img10 |   |
|           |  |       | |       | |       | |  [>]  | |       |   |
|           |  +-------+ +-------+ +-------+ +-------+ +-------+   |
|           |                                                       |
|           |  [Load More - 56 remaining]                          |
+------------------------------------------------------------------+
```

#### Component Details

**Gallery Grid**
- Mobile: 3 columns, uniform square thumbnails
- Tablet: 4 columns
- Desktop: 5-6 columns with optional masonry layout
- Gap: 4px between items
- Videos show play icon overlay

**Filter Tabs**
- Day filter: Horizontal scroll on mobile
- Person filter: Dropdown on mobile, pills on desktop
- Media type: Photos / Videos / All

**Upload Dropzone**
```
+------------------------------------------+
|  +------------------------------------+  |
|  |  [Icon]                            |  |
|  |                                    |  |
|  |  Drag & drop files here            |  |
|  |  or tap to browse                  |  |
|  |                                    |  |
|  |  Accepts: JPG, PNG, MP4, MOV       |  |
|  |  Max video size: 100MB             |  |
|  +------------------------------------+  |
|                                          |
|  Active drag state:                      |
|  - Border becomes dashed accent color    |
|  - Background lightens                   |
|  - Text changes to "Drop to upload"      |
+------------------------------------------+
```

**Upload Progress Item**
```
+------------------------------------------+
|  [Thumbnail] filename.jpg                |
|              [Progress bar========]  ✓   |
+------------------------------------------+

States:
- Waiting: Gray progress bar, "Waiting..."
- Uploading: Animated progress bar with percentage
- Processing: "Processing..." with spinner
- Complete: Green checkmark
- Error: Red X with "Retry" link
```

**Photo Viewer Modal**
- Swipe left/right to navigate (mobile)
- Arrow keys to navigate (desktop)
- Pinch to zoom (mobile)
- Click/scroll to zoom (desktop)
- Metadata overlay: uploader, date, download
- Share and delete options in menu

#### States

**Loading State**
- Skeleton grid with pulse animation
- Maintains grid structure

**Empty State**
- "No photos yet. Be the first to share!"
- Upload button prominent

**Upload Error State**
- "Failed to upload X files"
- List of failed files with retry options
- Common errors: File too large, unsupported format

**Infinite Scroll**
- Load 30 items initially
- Load more on scroll near bottom
- "Load More" button as fallback
- Shows remaining count

---

### 5. Attendees Page

#### Purpose
View all trip attendees, their payment information, and admin management features.

#### Mobile Layout (375px) - Standard User

```
+------------------------------------------+
|  Attendees                               |
+------------------------------------------+
|                                          |
|  16 People                               |
|                                          |
|  +------------------------------------+  |
|  |  [Large    ]  John (Groom)         |  |
|  |  [Avatar   ]  Organizer            |  |
|  |  [         ]                       |  |
|  |              Pay via:              |  |
|  |              Venmo: @john_doe      |  |
|  |              PayPal: john@mail.com |  |
|  +------------------------------------+  |
|                                          |
|  +------------------------------------+  |
|  |  [Avatar]  Mike                    |  |
|  |            Venmo: @mike_j          |  |
|  |            [View Payment Info]     |  |
|  +------------------------------------+  |
|  +------------------------------------+  |
|  |  [Avatar]  Sarah                   |  |
|  |            Venmo: @sarah_k         |  |
|  |            [View Payment Info]     |  |
|  +------------------------------------+  |
|  +------------------------------------+  |
|  |  [Avatar]  Tom                     |  |
|  |            CashApp: $TomB          |  |
|  |            [View Payment Info]     |  |
|  +------------------------------------+  |
|                                          |
|  ... (more attendees)                    |
|                                          |
+------------------------------------------+
```

#### Mobile Layout (375px) - Admin View

```
+------------------------------------------+
|  Attendees                    [+ Invite] |
+------------------------------------------+
|                                          |
|  16 People · 2 Pending Invites           |
|                                          |
|  PENDING INVITES                         |
|  +------------------------------------+  |
|  |  [?]  david@email.com              |  |
|  |       Invited Feb 10               |  |
|  |       [Resend] [Revoke]            |  |
|  +------------------------------------+  |
|  +------------------------------------+  |
|  |  [?]  chris@email.com              |  |
|  |       Invited Feb 12               |  |
|  |       [Resend] [Revoke]            |  |
|  +------------------------------------+  |
|                                          |
|  ATTENDEES                               |
|  +------------------------------------+  |
|  |  [Avatar]  John (Groom)      [You] |  |
|  |            Organizer               |  |
|  +------------------------------------+  |
|  +------------------------------------+  |
|  |  [Avatar]  Mike              [...]  |  |
|  |            Admin                   |  |
|  +------------------------------------+  |
|  +------------------------------------+  |
|  |  [Avatar]  Sarah             [...]  |  |
|  |            Member                  |  |
|  +------------------------------------+  |
|                                          |
+------------------------------------------+
```

#### Admin Action Menu (Bottom Sheet)

```
+------------------------------------------+
|                                          |
|  Mike                                    |
|  Joined Feb 8, 2025                     |
|                                          |
|  +------------------------------------+  |
|  |  Make Admin                        |  |
|  +------------------------------------+  |
|  +------------------------------------+  |
|  |  View Activity                     |  |
|  +------------------------------------+  |
|  +------------------------------------+  |
|  |  Revoke Access                 [!] |  |
|  +------------------------------------+  |
|                                          |
|  [Cancel]                                |
|                                          |
+------------------------------------------+
```

#### Invite Modal

```
+------------------------------------------+
|  [X Close]       Invite People           |
+------------------------------------------+
|                                          |
|  EMAIL ADDRESSES                         |
|  +------------------------------------+  |
|  |  Enter email addresses, one per   |  |
|  |  line or comma-separated          |  |
|  |                                    |  |
|  |  david@email.com                  |  |
|  |  chris@email.com                  |  |
|  |                                    |  |
|  +------------------------------------+  |
|                                          |
|  Or share invite link:                   |
|  +------------------------------------+  |
|  | https://steamboat.app/invite/xyz  |  |
|  | [Copy Link]                        |  |
|  +------------------------------------+  |
|                                          |
|  Note: Invites expire in 7 days          |
|                                          |
|  +------------------------------------+  |
|  |          SEND INVITES              |  |
|  +------------------------------------+  |
|                                          |
+------------------------------------------+
```

#### Desktop Layout (1200px)

```
+------------------------------------------------------------------+
|  SIDEBAR  |  Attendees                            [+ Invite]      |
|           |----------------------------------------------------- |
|           |                                                       |
|           |  PENDING (2)                                         |
|           |  +------------------------------------------------+  |
|           |  | Email            | Invited    | Actions        |  |
|           |  |------------------|------------|----------------|  |
|           |  | david@email.com  | Feb 10     | Resend | Revoke|  |
|           |  | chris@email.com  | Feb 12     | Resend | Revoke|  |
|           |  +------------------------------------------------+  |
|           |                                                       |
|           |  ATTENDEES (16)                                      |
|           |  +------------------------------------------------+  |
|           |  | [Avi] | Name     | Role    | Payment   |Actions|  |
|           |  |-------|----------|---------|-----------|-------|  |
|           |  | [J]   | John     | Groom   | @john_doe |       |  |
|           |  | [M]   | Mike     | Admin   | @mike_j   | [...] |  |
|           |  | [S]   | Sarah    | Member  | @sarah_k  | [...] |  |
|           |  | [T]   | Tom      | Member  | $TomB     | [...] |  |
|           |  +------------------------------------------------+  |
+------------------------------------------------------------------+
```

#### Component Details

**Attendee Card**
```
+------------------------------------------+
|  [Avatar]  Name                   [Role] |
|            Primary payment handle        |
|            [View Payment Info] or [...]  |
+------------------------------------------+
```

**Avatar Component**
- Size: 48px (list), 80px (featured)
- Circular with 2px border
- Fallback: Initials on colored background
- Online indicator: Green dot (optional)

**Role Badges**
- Groom: Gold/amber badge
- Organizer: Blue badge
- Admin: Purple badge
- Member: No badge (default)

**Pending Invite Card**
```
+------------------------------------------+
|  [?]  email@example.com                  |
|       Invited [Date]                     |
|       [Resend]  [Revoke]                 |
+------------------------------------------+
```

**Payment Info Expanded**
```
+------------------------------------------+
|  [Venmo Icon]   @username       [Copy]   |
|  [PayPal Icon]  email@mail.com  [Copy]   |
|  [CashApp Icon] $handle         [Copy]   |
|  [Zelle Icon]   555-123-4567    [Copy]   |
+------------------------------------------+
```

#### States

**Loading State**
- Skeleton cards for attendee list

**Empty State**
- "Invite friends to join the trip!"
- Prominent invite button

**Revoke Confirmation**
```
+------------------------------------------+
|  Revoke Access?                          |
|                                          |
|  [Name] will no longer be able to        |
|  access this trip. Their expenses        |
|  and photos will be preserved.           |
|                                          |
|  [Cancel]            [Revoke Access]     |
+------------------------------------------+
```

---

## Component Library

### Buttons

#### Primary Button
```css
Background: Accent Primary (#2563EB)
Text: White
Padding: 12px 24px
Border Radius: 4px
Font: Label (14px Medium)

Hover: Background darken 10%
Active: Background darken 20%
Disabled: Background #ADB5BD, cursor not-allowed
Loading: Show spinner, disable interaction
```

#### Secondary Button
```css
Background: Transparent
Border: 1px solid #DEE2E6
Text: Text Primary
Padding: 12px 24px

Hover: Background #F8F9FA
Active: Background #E9ECEF
```

#### Destructive Button
```css
Background: Transparent
Border: 1px solid Accent Error
Text: Accent Error

Hover: Background Error with 10% opacity
```

#### Icon Button
```css
Size: 44x44px (touch target)
Icon: 24x24px centered
Background: Transparent

Hover: Background #F8F9FA
Active: Background #E9ECEF
```

### Form Elements

#### Text Input
```
+------------------------------------------+
|  LABEL                                   |
|  +------------------------------------+  |
|  |  Placeholder text                 |  |
|  +------------------------------------+  |
|  Helper text or error message            |
+------------------------------------------+

Height: 44px
Padding: 12px 16px
Border: 1px solid #DEE2E6
Border Radius: 4px

Focus: Border Accent Primary, shadow
Error: Border Accent Error, helper text red
Disabled: Background #F8F9FA
```

#### Select/Dropdown
```
+------------------------------------------+
|  LABEL                                   |
|  +------------------------------------+  |
|  |  Selected option              [v] |  |
|  +------------------------------------+  |
+------------------------------------------+

Same styling as text input
Chevron icon on right
```

#### Toggle/Switch
```
OFF: [ O    ] Gray background
ON:  [    O ] Accent Primary background

Size: 48x28px
Circle: 24px diameter
Transition: 200ms ease
```

#### Checkbox
```
[ ] Unchecked: Border #DEE2E6
[✓] Checked: Background Accent Primary, white check

Size: 20x20px
Border Radius: 4px
```

#### Radio Button
```
( ) Unselected: Border #DEE2E6
(•) Selected: Border Accent Primary, filled center

Size: 20x20px
```

### Cards

#### Standard Card
```css
Background: White
Border: 1px solid #E9ECEF
Border Radius: 8px
Padding: 16px
Shadow: 0 1px 3px rgba(0,0,0,0.1)

Hover (if interactive): Shadow increases
Active: Background #F8F9FA
```

#### Expense Card
```
+------------------------------------------+
|  [Receipt    |  Title                    |
|   60x60px]   |  $Amount                  |
|              |  Payer · Date · Category  |
|------------------------------------------|
|  Split info  |  Your share: $XX.XX       |
|------------------------------------------|
|  [Opt In/Out Toggle]                     |
+------------------------------------------+
```

#### Activity Card
```
+------------------------------------------+
|  [Time]  TITLE                           |
|          Location              [Map]     |
|------------------------------------------|
|  Description text...                     |
|------------------------------------------|
|  RSVP: 12/16  [Yes] [No] [Maybe]        |
|------------------------------------------|
|  Linked: Expense Name - $XXX             |
+------------------------------------------+
```

### Navigation

#### Bottom Tab Bar (Mobile)
```
Height: 64px + safe area
Background: White
Border Top: 1px solid #E9ECEF
Shadow: 0 -2px 10px rgba(0,0,0,0.05)

Tab Item:
- Icon: 24x24px
- Label: Caption (12px)
- Gap: 4px between icon and label
- Active: Accent Primary color
- Inactive: Text Secondary color
```

#### Sidebar (Desktop)
```
Width: 240px (expanded), 64px (collapsed)
Background: #F8F9FA
Border Right: 1px solid #E9ECEF

Nav Item:
- Height: 44px
- Padding: 12px 16px
- Icon: 20px
- Label: Body (16px)
- Active: Background white, left border accent
- Hover: Background white
```

### Modals & Overlays

#### Modal (Desktop)
```
+------------------------------------------+
|  [X]  Modal Title                        |
|------------------------------------------|
|                                          |
|  Content area                            |
|                                          |
|------------------------------------------|
|              [Cancel] [Primary Action]   |
+------------------------------------------+

Max Width: 560px
Border Radius: 8px
Background: White
Overlay: Black 50% opacity
```

#### Bottom Sheet (Mobile)
```
+------------------------------------------+
|  [Drag Handle]                           |
|                                          |
|  Sheet Title                             |
|                                          |
|  Content area                            |
|                                          |
|  [Full Width Action Button]              |
|                                          |
+------------------------------------------+

Border Radius: 16px 16px 0 0 (top corners)
Drag handle: 40x4px, centered, #DEE2E6
Swipe down to dismiss
```

#### Toast/Snackbar
```
+------------------------------------------+
|  [Icon]  Message text            [Undo]  |
+------------------------------------------+

Position: Bottom center, 16px from bottom nav
Background: #212529
Text: White
Border Radius: 8px
Auto-dismiss: 4 seconds
```

### Avatars

#### Sizes
```
XS: 24px - Inline mentions
S:  32px - Lists, compact views
M:  40px - Standard lists
L:  48px - Cards, featured
XL: 80px - Profile pages
```

#### Variants
```
Image: Circular crop of user photo
Initials: Colored background with 2 letters
Placeholder: Gray background with user icon
```

### Status Indicators

#### Badges
```
Count Badge:
- Min width: 20px
- Height: 20px
- Background: Accent Error
- Text: White, Caption
- Border Radius: Full

Status Badge:
- Padding: 4px 8px
- Border Radius: Full
- Variants: Success, Warning, Error, Info
```

#### Progress Indicators
```
Linear:
- Height: 4px
- Background: #E9ECEF
- Fill: Accent Primary
- Border Radius: Full

Circular (Spinner):
- Size: 24px (default), 16px (small), 32px (large)
- Stroke: 3px
- Color: Accent Primary
- Animation: Rotate 1s linear infinite
```

---

## Interaction Patterns

### Loading States

#### Skeleton Screens
- Use for initial page loads
- Match layout structure of actual content
- Subtle pulse animation (opacity 0.5 to 1)
- Replace with content when ready

#### Inline Loading
- Use for actions within loaded pages
- Show spinner near action trigger
- Disable related interactions
- Show success/error feedback

#### Full Page Loading
- Only for authentication/initial app load
- Centered spinner with app logo
- Brief loading message

### Empty States

#### Structure
```
+------------------------------------------+
|                                          |
|           [Illustration/Icon]            |
|                                          |
|           Primary Message                |
|           Secondary explanation          |
|                                          |
|           [Primary Action]               |
|                                          |
+------------------------------------------+
```

#### Examples
- No expenses: "No expenses yet" + "Add the first expense"
- No photos: "No photos yet" + "Upload your first photo"
- No activities: "No activities planned" + "Create an activity"

### Error Handling

#### Form Validation
- Validate on blur for individual fields
- Validate on submit for form-level
- Show inline error messages below fields
- Highlight fields with error border
- Focus first error field on submit

#### Network Errors
- Show toast for transient errors
- Show inline retry for failed loads
- Preserve user input on submission errors
- Offer offline mode where possible

#### Error Message Tone
- Be specific about what went wrong
- Suggest how to fix
- Avoid technical jargon
- Don't blame the user

### Optimistic Updates

#### When to Use
- RSVP toggles
- Expense opt-in/out
- Adding items to lists

#### Implementation
- Update UI immediately
- Show subtle loading indicator
- Revert on failure with error toast
- Confirm success silently (or with subtle toast)

### Pull to Refresh (Mobile)

#### Implementation
- Available on scrollable lists
- Pull distance: 80px to trigger
- Show spinner during refresh
- Release to cancel if not triggered

### Infinite Scroll

#### Implementation
- Load 20-30 items initially
- Trigger load at 200px from bottom
- Show loading indicator at bottom
- "Load More" button as fallback
- End message when all loaded

### Gestures (Mobile)

#### Swipe Actions
- Swipe left on expense: Quick opt-out
- Swipe right on expense: View details
- Swipe photos: Navigate gallery

#### Long Press
- On expense: Show action menu
- On photo: Show options (download, delete)
- On attendee: Show admin actions

### Confirmation Dialogs

#### When to Use
- Destructive actions (delete, revoke)
- Irreversible changes
- Actions affecting others

#### Structure
```
Title: Action confirmation
Body: Explain consequences
Actions: [Cancel] [Confirm (destructive)]
```

---

## Accessibility Guidelines

### Color Contrast
- Text on backgrounds: Minimum 4.5:1 ratio
- Large text (18px+): Minimum 3:1 ratio
- Interactive elements: Minimum 3:1 ratio
- Don't rely on color alone for meaning

### Touch Targets
- Minimum size: 44x44px
- Spacing between targets: 8px minimum
- Increase size for primary actions

### Focus Management
- Visible focus indicators on all interactive elements
- Logical tab order
- Trap focus in modals
- Return focus after modal close

### Screen Reader Support
- Semantic HTML elements
- ARIA labels for icon buttons
- Alt text for images
- Announce dynamic content changes
- Mark decorative images as presentational

### Motion & Animation
- Respect prefers-reduced-motion
- Provide alternative to gesture-based interactions
- Avoid flashing content
- Keep animations under 5 seconds

### Form Accessibility
- Associated labels with inputs
- Error messages linked to fields
- Required field indicators
- Helpful placeholder text (not as label replacement)

### Keyboard Navigation
- All functionality available via keyboard
- Escape closes modals
- Arrow keys navigate lists
- Enter activates buttons

---

## Technical Considerations

### Responsive Breakpoints
```css
--mobile:  375px  (min-width base)
--tablet:  768px  (layout adjustments)
--desktop: 1024px (sidebar navigation)
--wide:    1200px (max content width)
```

### Image Optimization
- Gallery thumbnails: 300px width, WebP format
- Full images: Lazy load, max 1920px width
- Avatars: 96px for largest size, cached
- Receipts: Compressed on upload, original preserved

### Video Handling
- Max upload: 100MB
- Accepted formats: MP4, MOV
- Thumbnail generation on upload
- Streaming playback (not full download)

### Performance Targets
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Lighthouse Performance: > 90
- Bundle size: < 200KB initial

### Offline Support (Progressive Enhancement)
- Cache app shell
- Cache viewed gallery items
- Queue expense additions for sync
- Show offline indicator

### Deep Link Patterns
```
Venmo:    venmo://paycharge?txn=pay&recipients={handle}&amount={amount}
PayPal:   paypal://paypal.me/{handle}/{amount}
CashApp:  cashapp://cash.app/${handle}/{amount}
Zelle:    (No universal deep link - show copy button)
```

### Data Persistence
- Trip data: Server-synced
- User preferences: Local storage
- Draft expenses: Local storage
- Gallery cache: Service worker

---

## Appendix: Wireframe Reference

### Mobile Navigation Flow
```
Home ─┬─> Itinerary ──> Activity Detail
      ├─> Finances ──┬─> Add Expense
      │              ├─> Expense Detail
      │              └─> Settle Up
      ├─> Gallery ───┬─> Photo Viewer
      │              └─> Upload
      └─> More ──────┬─> Attendees ──> Person Detail
                     ├─> Settings
                     └─> Admin (if admin)
```

### State Machine: Expense Opt-In/Out
```
┌─────────┐    Opt Out    ┌───────────┐
│ Opted In│ ────────────> │ Opted Out │
│         │ <──────────── │           │
└─────────┘    Opt In     └───────────┘
     │                          │
     └──────────────────────────┘
              │
        Recalculates all
        participant shares
```

### State Machine: RSVP
```
┌─────────┐     ┌─────────┐     ┌─────────┐
│   Yes   │ <── │ No RSVP │ ──> │   No    │
└────┬────┘     └────┬────┘     └────┬────┘
     │               │               │
     └───────────────┼───────────────┘
                     │
               ┌─────┴─────┐
               │   Maybe   │
               └───────────┘
```

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-13 | Initial | Complete design document |

---

## Next Steps

1. **Design Review**: Gather feedback from stakeholders
2. **Prototype**: Create interactive prototype in Figma
3. **Component Development**: Build design system in code
4. **Accessibility Audit**: Test with screen readers
5. **User Testing**: Validate flows with target users
