# Property Selector Feature

This feature allows property owners to switch between their properties using a dropdown in the header and throughout the application.

## Components Added

### 1. PropertyContext (`app/contexts/PropertyContext.tsx`)
- Manages the list of user's properties
- Tracks the currently selected property
- Provides functions to switch properties
- Automatically filters properties based on user role (owner vs superuser)

### 2. Header Property Selector (`app/components/Header.tsx`)
- **Desktop**: Dropdown select in the header (hidden on mobile)
- **Mobile**: Clickable property name that opens a modal

### 3. PropertySelectorModal (`app/components/PropertySelectorModal.tsx`)
- Full-screen modal for mobile property selection
- Search functionality to find properties
- Shows property details (location, room count, type)

### 4. PropertyIndicator (`app/components/PropertyIndicator.tsx`)
- Shows current property name and details
- Configurable size and information display
- Used in page headers and dashboards

### 5. PropertySwitcher (`app/components/PropertySwitcher.tsx`)
- Standalone property switcher component
- Multiple variants: button, select, minimal
- Can be used anywhere in the app

### 6. useSelectedProperty Hook (`app/hooks/useSelectedProperty.ts`)
- Easy access to selected property data
- Utility functions for property management
- Loading and error states

## Usage Examples

### In Page Components
```tsx
import { useSelectedProperty } from '../hooks/useSelectedProperty';
import PropertyIndicator from '../components/PropertyIndicator';

function MyPage() {
  const { selectedProperty, hasMultipleProperties } = useSelectedProperty();
  
  return (
    <div>
      <h1>My Page</h1>
      {hasMultipleProperties && (
        <PropertyIndicator size="sm" />
      )}
      
      {/* Use selectedProperty.id to filter data */}
      <SomeComponent propertyId={selectedProperty?.id} />
    </div>
  );
}
```

### Property Switcher Component
```tsx
import PropertySwitcher from '../components/PropertySwitcher';

// Button variant (default)
<PropertySwitcher />

// Select dropdown variant
<PropertySwitcher variant="select" size="sm" />

// Minimal variant
<PropertySwitcher variant="minimal" showLabel={false} />
```

### Property Indicator
```tsx
import PropertyIndicator from '../components/PropertyIndicator';

// Full details
<PropertyIndicator />

// Minimal
<PropertyIndicator 
  size="sm" 
  showRoomCount={false} 
  showLocation={false} 
/>
```

## Backend Integration

The feature works with existing backend endpoints:

### For Property Owners (`role: 'owner'`)
- `GET /api/internal/properties` - Returns only properties owned by the user
- Properties are automatically filtered by `owner_id = user.id`

### For Superusers/Staff
- `GET /api/internal/platform/properties` - Returns all properties
- Can be filtered by various parameters

## Data Flow

1. **User Login**: PropertyContext fetches user's properties
2. **Property Selection**: User selects property from header dropdown
3. **State Management**: Selected property is stored in context and localStorage
4. **Data Filtering**: Components use `selectedProperty.id` to filter API calls
5. **Persistence**: Selected property persists across browser sessions

## Mobile Experience

- **Header**: Shows selected property name as a clickable button
- **Modal**: Full-screen property selector with search
- **Touch-friendly**: All interactive elements meet minimum touch target size

## Property Owner Experience

1. **Single Property**: No selector shown, property is auto-selected
2. **Multiple Properties**: 
   - Header dropdown on desktop
   - Clickable property name on mobile
   - Property indicator on relevant pages
   - All data automatically filtered to selected property

## Superuser Experience

- Can see all properties in the system
- Property selector allows switching context
- Useful for managing multiple properties
- Can access platform-wide analytics

## Error Handling

- **No Properties**: Shows "No property selected" message
- **Loading State**: Shows loading spinner in selectors
- **API Errors**: Displays error messages and fallback options
- **Offline**: Uses cached property list when available

## Performance Considerations

- Properties are fetched once on login and cached
- Selected property is persisted in localStorage
- API calls include property filtering to reduce data transfer
- Components only re-render when selected property changes

## Future Enhancements

1. **Property Favorites**: Allow users to mark frequently used properties
2. **Recent Properties**: Show recently selected properties first
3. **Property Groups**: Group properties by location or type
4. **Quick Switch**: Keyboard shortcuts for property switching
5. **Property Search**: Advanced search and filtering options