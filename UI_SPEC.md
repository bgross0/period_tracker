# Period Tracker - React UI/UX Specification

## 📋 Table of Contents
1. [Design System](#design-system)
2. [User Flows](#user-flows)
3. [Page Specifications](#page-specifications)
4. [Component Library](#component-library)
5. [Responsive Design](#responsive-design)
6. [Accessibility](#accessibility)

---

## Design System

### Color Palette

```css
/* Primary Colors - Warm & Approachable */
--primary-50: #FFF1F2;     /* Lightest pink background */
--primary-100: #FFE4E6;    /* Light pink hover states */
--primary-200: #FECDD3;    /* Soft pink accents */
--primary-300: #FDA4AF;    /* Medium pink */
--primary-400: #FB7185;    /* Bright pink */
--primary-500: #F43F5E;    /* Main brand color */
--primary-600: #E11D48;    /* Darker pink */
--primary-700: #BE123C;    /* Deep pink */

/* Secondary Colors - Calming Purple/Blue */
--secondary-50: #F5F3FF;
--secondary-100: #EDE9FE;
--secondary-500: #8B5CF6;   /* Accent color for charts */
--secondary-600: #7C3AED;

/* Neutral Colors */
--gray-50: #F9FAFB;        /* Page background */
--gray-100: #F3F4F6;       /* Card backgrounds */
--gray-200: #E5E7EB;       /* Borders */
--gray-300: #D1D5DB;       /* Disabled states */
--gray-400: #9CA3AF;       /* Placeholder text */
--gray-500: #6B7280;       /* Secondary text */
--gray-600: #4B5563;       /* Body text */
--gray-700: #374151;       /* Headings */
--gray-900: #111827;       /* Primary text */

/* Semantic Colors */
--success-50: #F0FDF4;
--success-500: #10B981;    /* Energy, positive */
--success-600: #059669;

--warning-50: #FFFBEB;
--warning-500: #F59E0B;    /* Warnings */
--warning-600: #D97706;

--error-50: #FEF2F2;
--error-500: #EF4444;      /* Errors, alerts */
--error-600: #DC2626;

--info-50: #EFF6FF;
--info-500: #3B82F6;       /* Information */
--info-600: #2563EB;

/* Chart Colors */
--chart-energy: #10B981;   /* Green */
--chart-mood: #3B82F6;     /* Blue */
--chart-sleep: #8B5CF6;    /* Purple */
--chart-flow: #F43F5E;     /* Pink */
```

### Typography

```css
/* Font Family */
--font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-display: 'Plus Jakarta Sans', 'Inter', sans-serif;

/* Font Sizes */
--text-xs: 0.75rem;      /* 12px - Small labels */
--text-sm: 0.875rem;     /* 14px - Body text */
--text-base: 1rem;       /* 16px - Default */
--text-lg: 1.125rem;     /* 18px - Large body */
--text-xl: 1.25rem;      /* 20px - Small headings */
--text-2xl: 1.5rem;      /* 24px - Card titles */
--text-3xl: 1.875rem;    /* 30px - Page titles */
--text-4xl: 2.25rem;     /* 36px - Hero text */

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;

/* Line Heights */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.75;
```

### Spacing Scale

```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
```

### Border Radius

```css
--radius-sm: 0.375rem;   /* 6px - Buttons */
--radius-md: 0.5rem;     /* 8px - Cards */
--radius-lg: 0.75rem;    /* 12px - Modals */
--radius-xl: 1rem;       /* 16px - Large cards */
--radius-full: 9999px;   /* Pills, avatars */
```

### Shadows

```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
```

---

## User Flows

### 1. First Time User Onboarding

```
Landing Page
    ↓
Sign Up Form
    ↓
Welcome Screen (Explain features)
    ↓
Quick Setup:
  - Enter last period start date
  - Average cycle length
  - Notification preferences
    ↓
Dashboard (Empty State)
    ↓
Prompt: "Log your first day"
    ↓
Daily Log Form
    ↓
Dashboard with first data point
```

### 2. Daily Logging Flow

```
Dashboard
    ↓
Click "Log Today" (prominent CTA)
    ↓
Daily Log Form:
  1. Flow level (if applicable)
  2. Mood slider
  3. Energy slider
  4. Sleep input
  5. Symptoms (checkboxes)
  6. Notes (optional)
    ↓
Submit
    ↓
Success confirmation
    ↓
Dashboard updated with new data
    ↓
AI insight popup (if pattern detected)
```

### 3. Viewing Analytics

```
Dashboard
    ↓
Click "Analytics" tab
    ↓
Analytics Page:
  - Cycle stats card
  - Trend charts
  - Symptom breakdown
  - Pattern insights
    ↓
Click specific insight
    ↓
Detailed insight modal with recommendations
```

### 4. Chat Interaction

```
Dashboard
    ↓
Click "AI Assistant" tab or chat bubble
    ↓
Chat Interface:
  - Suggested questions (if first time)
  - Chat history
  - Input field
    ↓
User asks question
    ↓
Loading state (typing indicator)
    ↓
AI response with relevant data citations
    ↓
User can ask follow-up questions
```

### 5. Viewing Predictions

```
Dashboard
    ↓
"Predictions" card shows:
  - Next period date (prominent)
  - Confidence indicator
  - Days until
    ↓
Click "View Details"
    ↓
Predictions Page:
  - Next period prediction
  - Ovulation window
  - Symptom predictions
  - Early warnings
    ↓
User can tap on any prediction for more info
```

---

## Page Specifications

### 1. Landing Page (Before Login)

**Purpose:** Convert visitors to users

**Layout:**
```
┌─────────────────────────────────────────────────┐
│  LOGO                         Login   Sign Up   │ Navigation
├─────────────────────────────────────────────────┤
│                                                 │
│         HERO SECTION                            │
│   Understand Your Cycle with AI                 │
│   [Large illustration of cycle visualization]   │
│                                                 │
│   [CTA: Start Tracking Free]                    │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│   FEATURES (3 columns)                          │
│   ┌────────┐  ┌────────┐  ┌────────┐          │
│   │ Track  │  │ Predict│  │   AI   │          │
│   │ Daily  │  │ Cycles │  │ Insights│         │
│   └────────┘  └────────┘  └────────┘          │
│                                                 │
├─────────────────────────────────────────────────┤
│   HOW IT WORKS (Step by step)                   │
├─────────────────────────────────────────────────┤
│   TESTIMONIALS                                  │
├─────────────────────────────────────────────────┤
│   FOOTER                                        │
└─────────────────────────────────────────────────┘
```

**Components:**
- Hero with animated background
- Feature cards with icons
- Step-by-step illustration
- Social proof section
- CTA buttons throughout

---

### 2. Dashboard (Main App View)

**Purpose:** Central hub for all user actions

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  LOGO    Dashboard  Analytics  Chat    Profile      🔔 │ Header
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Welcome Back, Sarah! 👋                         │  │ Greeting
│  │  Day 12 of your cycle • Ovulation phase          │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌────────────────────┐  ┌────────────────────┐       │
│  │  NEXT PERIOD       │  │  TODAY'S CHECK-IN  │       │ Primary
│  │                    │  │                    │       │ Actions
│  │  Dec 3, 2024       │  │  [Log Today]      │       │
│  │  21 days away      │  │                    │       │
│  │  85% confidence    │  │  Last: Yesterday   │       │
│  └────────────────────┘  └────────────────────┘       │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  CYCLE VISUALIZATION                            │   │ Main
│  │  [Interactive cycle calendar/chart]             │   │ Content
│  │  Shows current phase, flow days, predicted days│   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌───────────────┐  ┌───────────────┐  ┌──────────┐   │
│  │  MOOD TREND   │  │ ENERGY TREND  │  │ WARNINGS │   │ Secondary
│  │  [Mini chart] │  │  [Mini chart] │  │  (2)     │   │ Widgets
│  └───────────────┘  └───────────────┘  └──────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  RECENT INSIGHTS                                │   │ Insights
│  │  • Sleep quality affects your mood (r=0.72)    │   │
│  │  • Cramps mostly occur in menstrual phase      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  QUICK ACTIONS                                  │   │ Actions
│  │  [View History] [Export Data] [Invite Friend]  │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Key Components:**

1. **Cycle Status Header**
   - Current day of cycle
   - Current phase (with color coding)
   - Progress indicator

2. **Next Period Card**
   - Large, prominent date
   - Countdown timer
   - Confidence percentage
   - Visual indicator (calendar icon with date)

3. **Log Today Button**
   - Primary CTA
   - Always visible
   - Shows "completed" checkmark if already logged today
   - Badge if not logged in 24+ hours

4. **Cycle Visualization**
   - Circular or linear calendar
   - Color-coded phases
   - Flow intensity markers
   - Predicted days (lighter/dashed)
   - Interactive - click day for details

5. **Mini Trend Charts**
   - Last 7 days of data
   - Sparkline style
   - Quick visual reference
   - Click to expand

6. **Warnings/Alerts Card**
   - Count badge
   - List of upcoming warnings
   - Color-coded by severity
   - Dismissible

---

### 3. Daily Log Modal/Page

**Purpose:** Capture daily health data quickly and easily

**Layout:**
```
┌─────────────────────────────────────────────────┐
│  Log for November 6, 2024                    ✕ │ Header
├─────────────────────────────────────────────────┤
│                                                 │
│  PERIOD FLOW                                    │ Section 1
│  ○ None  ○ Spotting  ○ Light  ● Medium  ○ Heavy│
│                                                 │
├─────────────────────────────────────────────────┤
│  HOW ARE YOU FEELING?                           │ Section 2
│                                                 │
│  Mood: Happy 😊                                 │
│  [━━━━━●━━━━] 7/10                             │
│                                                 │
│  Energy Level                                   │
│  [━━━━━━●━━━] 8/10                             │
│                                                 │
├─────────────────────────────────────────────────┤
│  SLEEP                                          │ Section 3
│  Hours: [  7.5  ] ▼                            │
│  Quality: [━━━━●━━━━━] 8/10                    │
│                                                 │
├─────────────────────────────────────────────────┤
│  SYMPTOMS (Select all that apply)               │ Section 4
│  ☑ Cramps      ☐ Headache    ☐ Bloating       │
│  ☐ Back Pain   ☑ Fatigue     ☐ Nausea         │
│  ☐ Acne        ☐ Irritable   ☐ Anxious        │
│  [+ Add Custom]                                 │
│                                                 │
│  Severity for selected:                         │
│  Cramps:  [━━━━━●━━━━] 6/10                    │
│  Fatigue: [━━━━●━━━━━] 5/10                    │
│                                                 │
├─────────────────────────────────────────────────┤
│  NOTES (Optional)                               │ Section 5
│  ┌─────────────────────────────────────────┐   │
│  │ Felt good overall, mild cramping in... │   │
│  │                                         │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
├─────────────────────────────────────────────────┤
│           [Cancel]    [Save Entry]              │ Actions
└─────────────────────────────────────────────────┘
```

**UX Considerations:**
- Auto-save draft every 30 seconds
- Keyboard shortcuts (Enter to save)
- Smart defaults (pre-fill based on yesterday)
- Progressive disclosure (symptoms only show severity if checked)
- Visual feedback on selection
- Mobile-optimized touch targets (48px minimum)
- Swipe gestures on mobile

**Validation:**
- All fields optional except date
- Show warning if leaving without saving
- Highlight incomplete sections

---

### 4. Analytics Page

**Purpose:** Deep dive into patterns and trends

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  Analytics                                      🔽 Export│ Header
├─────────────────────────────────────────────────────────┤
│  [Last 3 Months ▼]  [All Time]  [Custom Range]         │ Filters
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌────────────────────────────────────────────────┐    │
│  │  CYCLE STATISTICS                              │    │ Stats
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐       │    │ Cards
│  │  │Avg Cycle │ │Avg Period│ │Regularity│       │    │
│  │  │  28.5    │ │  4.8     │ │   92%    │       │    │
│  │  │  days    │ │  days    │ │          │       │    │
│  │  └──────────┘ └──────────┘ └──────────┘       │    │
│  └────────────────────────────────────────────────┘    │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  TRENDS OVER TIME                               │   │ Main
│  │  [Tabs: Mood | Energy | Sleep | Symptoms]      │   │ Charts
│  │                                                 │   │
│  │  [Large multi-line chart showing selected      │   │
│  │   metrics over time with cycle phase overlays] │   │
│  │                                                 │   │
│  │  Legend: ━ Energy  ━ Mood  ━ Sleep Quality    │   │
│  │  Cycle phases shown as background colors       │   │
│  └─────────────────────────────────────────────────┘   │