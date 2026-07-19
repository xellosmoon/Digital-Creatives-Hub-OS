# Calendar Grid Modernization Plan (Updated)

## Objective
Replace the broken vertical icon stack with a premium horizontal icon badge bar. Swap out the existing "quick book" calendar popover with an agenda view that showcases beautiful mini-cards for each event, complete with individual booking links.

---

## Codebase Analysis

### Current Implementation

**Files Involved:**
- `src/components/calendar/PublicCalendar.tsx` (449 lines) - Main calendar component
- `src/components/calendar/EventChip.tsx` (39 lines) - Event pill component with truncated text
- `src/components/calendar/EventDetailsModal.tsx` (258 lines) - Full-screen event details modal
- `src/lib/useEvents.ts` - Events data fetching hook
- `src/types/index.ts` - CalendarEvent type definition

**Current State:**
- Grid cells currently use horizontal pills with counts (e.g., "📅 2 Events")
- Simple group-hover popover shows event list
- QuickBookingModal opens when clicking date cells
- Workshop and bundle bookings shown as count pills
- Occupancy bar and metrics displayed in each cell
- Uses Tailwind CSS (no Radix UI or Headless UI installed)

**Current EventChip Implementation:**
```tsx
<button className="w-full text-left px-1.5 py-0.5 rounded text-xs truncate
               bg-amber-100 text-amber-800 font-medium
               hover:bg-amber-200 transition-colors cursor-pointer
               flex items-center gap-1">
  <CalendarIcon className="w-3 h-3 flex-shrink-0" />
  <span className="truncate">{event.title}</span>  // ← This gets cut off
</button>
```

**Dependencies:**
- React 18.2.0
- Tailwind CSS 3.4.0
- date-fns 3.0.0
- lucide-react 0.303.0
- Supabase client
- **No Radix UI or Headless UI installed**

---

## Implementation Strategy (Updated)

### Phase 1: Horizontal Badge Row in Date Cells

**1.1 Remove Current Count Pills**
- Remove the current "📅 2 Events" count-based pills
- Remove workshop and bundle count pills
- Keep occupancy bar and metrics intact

**1.2 Implement Horizontal Icon Badge Row**
- Use `flex flex-row items-center gap-1.5 mt-2 flex-wrap`
- Render distinct icon badges for each event based on type
- Maximum 3 visible badges + overflow counter

**1.3 Category Icon Mapping**
```tsx
// Workshop events
<Terminal className="w-4 h-4 text-orange-500" /> // Vibrant Orange

// Events/Gatherings
<Sparkles className="w-4 h-4 text-blue-600" /> // Deep Corporate Blue
// OR
<PartyPopper className="w-4 h-4 text-blue-600" />

// Other/Default
<Circle className="w-4 h-4 text-gray-400" /> // Clean geometric dot
```

**1.4 Badge Styling**
```tsx
<div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 hover:scale-110 transition-transform cursor-pointer">
  <Icon className="w-4 h-4" />
</div>
```

**1.5 Overflow Handling**
- If day has >3 events: show first 2 icons + "+N" badge
- Overflow badge: small rounded pill with count
- Example: `[Icon1] [Icon2] [+2]`

---

### Phase 2: Agenda Mini-Card Popover

**2.1 Replace QuickBookingModal with Agenda View**
- Remove the quick-booking input form
- Replace with Agenda Preview Container
- Trigger: Click on date cell (not individual badges)

**2.2 Agenda Container Styling**
```tsx
<div className="w-80 sm:w-96 p-4 bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-100 shadow-2xl">
  {/* Content */}
</div>
```

**2.3 Header Section**
```tsx
<h3 className="text-lg font-bold text-slate-900 mb-4">
  Agenda for {format(selectedDate, 'MMMM d, yyyy')}
</h3>
```

**2.4 Mini-Card Feed**
- Map over day's events
- Each event rendered as distinct miniature card
- Card styling: soft gradient accent border, clean spacing, bold typography

**Mini-Card Structure:**
```tsx
<div className="p-3 mb-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 hover:border-blue-200 transition-colors">
  {/* Title */}
  <h4 className="text-sm font-bold text-blue-900 mb-1">{event.title}</h4>

  {/* Metadata */}
  <div className="flex items-center gap-2 text-xs text-slate-600 mb-2">
    <Clock className="w-3 h-3" />
    <span>{formatTime(event.start_time)} – {formatTime(event.end_time)}</span>
  </div>

  {event.organizer && (
    <div className="flex items-center gap-2 text-xs text-slate-600 mb-3">
      <User className="w-3 h-3" />
      <span>Hosted by {event.organizer}</span>
    </div>
  )}

  {/* Contextual Button */}
  <button className="w-full px-3 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all">
    🗓️ Book a Seat
  </button>
</div>
```

**2.5 Contextual Button Logic**
- Future events: "🗓️ Book a Seat" → Opens booking modal for that date
- Past events with Facebook URL: "📸 Highlights" → Links to Facebook post
- Past events without Facebook: "📋 View Details" → Opens EventDetailsModal

**2.6 Empty State**
```tsx
<div className="text-center py-8">
  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
  <p className="text-slate-600 mb-4">No events today</p>
  <button className="text-blue-600 hover:text-blue-700 font-semibold text-sm">
    Propose an Event →
  </button>
</div>
```

---

### Phase 3: Event Type Detection

**3.1 Determine Event Type**
- Check if event title contains workshop-related keywords
- Or add `event_type` field to CalendarEvent type
- Default to "event" type for gatherings

**3.2 Icon Selection Helper**
```tsx
const getEventIcon = (event: CalendarEvent) => {
  const isWorkshop = event.title.toLowerCase().includes('workshop') ||
                     event.title.toLowerCase().includes('training') ||
                     event.title.toLowerCase().includes('bootcamp');

  if (isWorkshop) return Terminal;
  if (event.is_featured) return Sparkles;
  return Calendar;
};
```

---

## Step-by-Step Implementation (Updated)

### Step 1: Create AgendaPopover Component
- File: `src/components/calendar/AgendaPopover.tsx`
- Implement agenda container with glassmorphic design
- Add mini-card feed for events
- Implement contextual button logic (Book Seat vs Highlights)
- Add empty state with Propose Event link

### Step 2: Add Icon Imports to PublicCalendar
- Import Terminal, Sparkles, PartyPopper, Circle from lucide-react
- Import User icon for host display

### Step 3: Update PublicCalendar Date Cells
- Remove current count pills ("📅 2 Events")
- Implement horizontal badge row with flex-wrap
- Add event type detection helper function
- Render individual icon badges for each event (max 3 + overflow)
- Keep occupancy bar and metrics intact

### Step 4: Replace QuickBookingModal with AgendaPopover
- Remove QuickBookingModal import and state
- Add AgendaPopover import and state
- Update date cell click handler to show AgendaPopover
- Pass selected date and events to AgendaPopover

### Step 5: Implement Contextual Button Logic
- Check if event is in the past
- If past + has Facebook URL: show "📸 Highlights" button
- If past + no Facebook: show "📋 View Details" button
- If future: show "🗓️ Book a Seat" button

### Step 6: Add Empty State
- Check if day has zero events
- Show friendly empty state with calendar icon
- Add "Propose an Event" link (navigate to propose event page)

### Step 7: Polish and Refine
- Add smooth animations and transitions
- Ensure accessibility (keyboard navigation, ARIA labels)
- Test with multiple events per day
- Verify overflow handling works correctly
- Test contextual button logic for past/future events
- Verify occupancy metrics remain intact

---

## Technical Considerations

**Positioning Strategy:**
- Use absolute positioning relative to clicked date cell
- Calculate popover position to avoid viewport clipping
- Add buffer zones for safe positioning
- Consider scroll position in calculations

**Event Type Detection:**
- Use keyword matching in event titles (workshop, training, bootcamp)
- Consider adding `event_type` field to database schema for more reliable categorization
- Fallback to default icon if no type detected

**Performance:**
- Use CSS transforms for smooth animations
- Minimize re-renders with proper memoization
- Lazy load event details only when popover opens

**Accessibility:**
- Add `aria-haspopup` and `aria-expanded` attributes
- Support keyboard navigation (Enter/Space to open popover)
- Add proper focus management
- Ensure sufficient color contrast for badges
- Add ARIA labels for icon badges

**Contextual Button Logic:**
- Compare event start_time with current date
- Check for facebook_post_url field on CalendarEvent type
- Handle edge cases (events happening today, events without organizer)

---

## Testing Checklist

- [ ] Horizontal badge row displays correctly with flex-wrap
- [ ] Event icons match type (workshop = orange, events = blue)
- [ ] Overflow counter shows when >3 events
- [ ] Occupancy metrics remain visible and accurate
- [ ] Clicking date cell opens AgendaPopover
- [ ] AgendaPopover shows correct date header
- [ ] Mini-cards display full event titles (no truncation)
- [ ] Mini-cards show time and host information
- [ ] Contextual buttons work correctly:
  - [ ] Future events show "Book a Seat"
  - [ ] Past events with Facebook show "Highlights"
  - [ ] Past events without Facebook show "View Details"
- [ ] Empty state displays when no events
- [ ] "Propose an Event" link navigates correctly
- [ ] Multiple events per day handled correctly
- [ ] Featured events use Sparkles icon
- [ ] Keyboard navigation works
- [ ] Smooth animations on all interactions
- [ ] No console errors
- [ ] Responsive on all screen sizes

---

## Estimated Implementation Time

- Step 1 (AgendaPopover component): 2-3 hours
- Step 2 (Icon imports): 0.5 hours
- Step 3 (Date cell badge row): 1.5-2 hours
- Step 4 (Replace QuickBookingModal): 1 hour
- Step 5 (Contextual button logic): 1-1.5 hours
- Step 6 (Empty state): 0.5 hours
- Step 7 (Polish and testing): 1-2 hours

**Total: 7.5-10.5 hours**

---

## Notes

- No new dependencies required (using pure React + Tailwind)
- Existing EventDetailsModal can remain as full-detail view
- AgendaPopover replaces QuickBookingModal for date cell clicks
- Occupancy bar must remain untouched per requirements
- Glassmorphic design should match existing premium theme
- Event type detection via keywords is temporary; consider database schema update
