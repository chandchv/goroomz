# Touch Gesture Support

This document describes the touch gesture features implemented in the Internal Management System.

## Overview

The application supports various touch gestures to enhance usability on tablets and mobile devices, making it easier for staff to navigate and interact with the system while moving around the property.

## Implemented Gestures

### 1. Swipe Gestures

**Purpose**: Navigate between tabs and views without tapping

**Implementation**: Using `react-swipeable` library via custom `useSwipe` hook

**Supported Actions**:
- **Swipe Left**: Move to the next tab (e.g., from "All" to "Pending" bookings)
- **Swipe Right**: Move to the previous tab
- **Swipe Up/Down**: Can be configured for scrolling or other actions

**Where It's Used**:
- Booking Management Page: Swipe between booking status tabs
- Reports Page: Swipe between different report types
- Any page with tabbed navigation

**Example Usage**:
```typescript
import { useSwipe } from '../hooks/useSwipe';

const swipeHandlers = useSwipe({
  onSwipeLeft: () => navigateToNextTab(),
  onSwipeRight: () => navigateToPreviousTab(),
  threshold: 50, // Minimum swipe distance in pixels
});

return <div {...swipeHandlers}>Content</div>;
```

### 2. Long-Press Gestures

**Purpose**: Show context menus or additional options without cluttering the UI

**Implementation**: Custom `useLongPress` hook

**Supported Actions**:
- **Long Press (500ms)**: Trigger context menu or additional actions
- **Short Tap**: Normal click action

**Where It's Used**:
- Room Cards: Long-press to show quick actions (update status, view details, etc.)
- Booking Cards: Long-press for quick actions (check-in, cancel, etc.)
- List items: Long-press for bulk selection or additional options

**Example Usage**:
```typescript
import { useLongPress } from '../hooks/useLongPress';

const longPressHandlers = useLongPress({
  onLongPress: () => showContextMenu(),
  onClick: () => handleNormalClick(),
  delay: 500, // Long press duration in milliseconds
});

return <div {...longPressHandlers}>Item</div>;
```

## Touch-Friendly Design

### Minimum Touch Target Sizes

All interactive elements follow accessibility guidelines:
- **Minimum size**: 44x44 pixels (iOS/Android standard)
- **Larger targets**: 56x56 pixels for primary actions
- **Spacing**: Adequate spacing between touch targets to prevent mis-taps

**CSS Classes**:
```css
.min-h-touch { min-height: 44px; }
.min-w-touch { min-width: 44px; }
.min-h-touch-lg { min-height: 56px; }
.min-w-touch-lg { min-width: 56px; }
```

### Touch Optimization

- **Active States**: Visual feedback on touch (`:active` pseudo-class)
- **No Hover Dependency**: All functionality accessible without hover
- **Touch Manipulation**: Optimized touch response with `touch-action: manipulation`
- **Prevent Text Selection**: Interactive elements prevent accidental text selection

## Responsive Breakpoints

The application uses Tailwind CSS breakpoints optimized for different devices:

- **xs**: 475px (small phones)
- **sm**: 640px (phones)
- **md**: 768px (tablets)
- **lg**: 1024px (desktop)
- **xl**: 1280px (large desktop)
- **2xl**: 1536px (extra large desktop)

## Floating Action Button (FAB)

**Purpose**: Quick access to common tasks on mobile/tablet

**Location**: Bottom-right corner (hidden on desktop)

**Features**:
- Expands to show quick action buttons
- Includes: Check-In, Check-Out, New Booking, Room Status
- Only shows actions the user has permission to access
- Automatically hides when user navigates

## Best Practices

### For Developers

1. **Always use touch-friendly sizes**: Apply `min-h-touch` and `min-w-touch` classes to buttons and interactive elements
2. **Test on actual devices**: Emulators don't accurately represent touch interactions
3. **Provide visual feedback**: Use `active:` states for immediate touch feedback
4. **Consider thumb zones**: Place frequently used actions within easy thumb reach
5. **Avoid hover-only features**: Ensure all functionality is accessible via touch

### For Users

1. **Swipe between tabs**: Instead of tapping tabs, swipe left/right to navigate
2. **Long-press for options**: Hold down on items to see additional actions
3. **Use the FAB**: Tap the floating button in the bottom-right for quick actions
4. **Landscape mode**: Rotate device for better view of tables and grids

## Accessibility

All touch gestures maintain accessibility standards:
- **Keyboard navigation**: All actions accessible via keyboard
- **Screen readers**: Proper ARIA labels and roles
- **Focus indicators**: Clear focus states for keyboard users
- **Alternative access**: Touch gestures supplement, not replace, standard interactions

## Future Enhancements

Potential additions for future versions:
- Pinch-to-zoom on floor plans
- Pull-to-refresh on data lists
- Drag-and-drop for room assignments
- Multi-touch gestures for bulk operations
- Haptic feedback on supported devices
