# Requirements Document

## Introduction

This document outlines the requirements for implementing and connecting property-room hierarchy features across both the internal management system and the property owner dashboard. While some room management components exist in the codebase (PropertyDetailPage, BulkRoomCreationModal), they are not routed or accessible. Additionally, property owners in the public-facing application have no visibility into their rooms. This spec addresses making room management fully functional and accessible to both internal users and property owners.

## Glossary

- **Internal Management System**: The staff-facing application (`internal-management/`) where agents/platform users manage properties
- **Property Owner Dashboard**: The public-facing dashboard (`src/pages/OwnerDashboard.jsx`) where property owners view their properties
- **Property**: A physical building or establishment (e.g., a PG, hotel, or hostel) that contains one or more rooms
- **Room**: An individual bookable unit within a property with a specific room number (e.g., Room 101, Room 102)
- **Bed**: An individual sleeping space within a room that can be booked separately (relevant for PG/hostel properties)
- **Property Owner**: A user who owns one or more properties and accesses the public-facing dashboard
- **Agent/Platform User**: Internal staff who onboard and manage properties in the internal management system
- **Room Hierarchy**: The parent-child relationship between properties, rooms, and beds
- **Sharing Type**: The occupancy configuration of a room (single, double, triple, quad sharing)
- **Floor Convention**: The automatic naming pattern for rooms based on floor number (e.g., 101-109 for floor 1, 201-209 for floor 2)

## Requirements

### Requirement 1

**User Story:** As an agent/platform user, I want to access property details with room management from the properties list, so that I can view and manage rooms for each property.

#### Acceptance Criteria

1. WHEN an agent views the properties list THEN the system SHALL display a "View Details" or "Manage Rooms" action for each property
2. WHEN an agent clicks on property details THEN the system SHALL navigate to the property detail page showing room hierarchy
3. WHEN the property detail page loads THEN the system SHALL display property information and all associated rooms
4. WHEN a property has no rooms THEN the system SHALL display a prominent "Add Rooms" button
5. WHEN the route is accessed THEN the system SHALL verify the user has appropriate permissions to view property details

### Requirement 2

**User Story:** As an agent/platform user, I want to bulk create rooms for a property during or after onboarding, so that I can quickly set up properties with multiple rooms.

#### Acceptance Criteria

1. WHEN an agent clicks "Add Rooms" THEN the system SHALL display the bulk room creation modal
2. WHEN the agent specifies floor number and room range THEN the system SHALL generate a preview of rooms to be created
3. WHEN the agent specifies sharing type THEN the system SHALL automatically set bed counts based on sharing type
4. WHEN the agent submits the form THEN the system SHALL create all rooms with the specified configuration
5. WHEN room creation completes THEN the system SHALL refresh the property detail page to show the new rooms

### Requirement 3

**User Story:** As an agent/platform user, I want to view rooms organized by floor in a tabular format, so that I can quickly assess occupancy status.

#### Acceptance Criteria

1. WHEN viewing property details THEN the system SHALL display rooms grouped by floor number
2. WHEN displaying room information THEN the system SHALL show room number, sharing type, total beds, occupied beds, vacant beds, and current status
3. WHEN a room has bookings THEN the system SHALL calculate occupied bed count from active bed assignments
4. WHEN displaying floors THEN the system SHALL sort floors in ascending order
5. WHEN displaying rooms within a floor THEN the system SHALL sort rooms by room number

### Requirement 4

**User Story:** As an agent/platform user, I want to filter rooms by floor, sharing type, or status, so that I can quickly find specific rooms.

#### Acceptance Criteria

1. WHEN an agent applies a floor filter THEN the system SHALL display only rooms on that floor
2. WHEN an agent applies a sharing type filter THEN the system SHALL display only rooms with that sharing type
3. WHEN an agent applies a status filter THEN the system SHALL display only rooms with that status
4. WHEN multiple filters are active THEN the system SHALL apply all filters using AND logic
5. WHEN filters are cleared THEN the system SHALL restore the full room list

### Requirement 5

**User Story:** As a property owner, I want to view my properties with their associated rooms in my dashboard, so that I can see the complete structure of my properties.

#### Acceptance Criteria

1. WHEN a property owner views their dashboard THEN the system SHALL display each property with room count and occupancy statistics
2. WHEN a property owner clicks on a property THEN the system SHALL expand or navigate to show room details
3. WHEN displaying property cards THEN the system SHALL show total rooms, occupied rooms, vacant rooms, and occupancy percentage
4. WHEN a property has no rooms THEN the system SHALL display a message indicating rooms are being set up by staff
5. WHEN loading property data THEN the system SHALL fetch both property and room information efficiently

### Requirement 6

**User Story:** As a property owner, I want to see room details in a floor-wise view, so that I can understand occupancy status across my property.

#### Acceptance Criteria

1. WHEN a property owner views room details THEN the system SHALL display rooms organized by floor number
2. WHEN displaying room information THEN the system SHALL show room number, sharing type, total beds, occupied beds, and vacant beds
3. WHEN a room has bookings THEN the system SHALL display current occupant information (respecting privacy)
4. WHEN displaying floor sections THEN the system SHALL sort floors in ascending order
5. WHEN displaying rooms within a floor THEN the system SHALL sort rooms by room number

### Requirement 7

**User Story:** As a property owner, I want to see bed-level occupancy details for each room, so that I can track which specific beds are occupied or vacant.

#### Acceptance Criteria

1. WHEN a property owner clicks on a room THEN the system SHALL display detailed bed-level information
2. WHEN displaying bed details THEN the system SHALL show bed number, occupancy status, and booking dates
3. WHEN a bed is occupied THEN the system SHALL display check-in and check-out dates
4. WHEN a bed is vacant THEN the system SHALL clearly indicate availability
5. WHEN multiple beds in a room are occupied THEN the system SHALL display all occupants with their respective booking information

### Requirement 8

**User Story:** As a property owner, I want to see summary statistics for my properties, so that I can understand overall performance.

#### Acceptance Criteria

1. WHEN a property owner views their dashboard THEN the system SHALL display total rooms, total beds, occupied beds, and vacancy rate for each property
2. WHEN calculating occupancy THEN the system SHALL compute the percentage of occupied beds versus total beds
3. WHEN displaying revenue THEN the system SHALL show total revenue from all bookings for each property
4. WHEN viewing statistics THEN the system SHALL show data for the current month by default
5. WHEN multiple properties exist THEN the system SHALL display aggregate statistics across all properties

### Requirement 9

**User Story:** As a property owner, I want to see upcoming check-ins and check-outs, so that I can prepare my property accordingly.

#### Acceptance Criteria

1. WHEN a property owner views their dashboard THEN the system SHALL display upcoming check-ins and check-outs for the next 7 days
2. WHEN displaying upcoming events THEN the system SHALL show room number, guest name, and date
3. WHEN a check-in is today THEN the system SHALL highlight it prominently
4. WHEN a check-out is today THEN the system SHALL highlight it prominently
5. WHEN clicking on an upcoming event THEN the system SHALL display booking details

### Requirement 10

**User Story:** As a system, I want to maintain referential integrity between properties and rooms, so that data consistency is preserved.

#### Acceptance Criteria

1. WHEN a room is created THEN the system SHALL require a valid property ID reference
2. WHEN querying rooms THEN the system SHALL always include valid property reference data
3. WHEN a property owner is changed THEN the system SHALL update ownership for both the property and all associated rooms
4. WHEN database constraints are violated THEN the system SHALL prevent the operation and return descriptive error messages
5. WHEN rooms are created or updated THEN the system SHALL maintain consistent data across both internal management and property owner views

### Requirement 11

**User Story:** As a system, I want to ensure proper API endpoints exist for room management, so that both internal and external applications can access room data.

#### Acceptance Criteria

1. WHEN fetching rooms for a property THEN the system SHALL provide an API endpoint that returns rooms with bed-level details
2. WHEN creating rooms in bulk THEN the system SHALL provide an API endpoint that accepts floor, room range, and sharing type parameters
3. WHEN updating room status THEN the system SHALL provide an API endpoint that validates permissions and updates the room
4. WHEN querying room occupancy THEN the system SHALL provide an API endpoint that calculates occupied and vacant bed counts
5. WHEN API requests are made THEN the system SHALL enforce proper authentication and authorization

### Requirement 12

**User Story:** As a property owner, I want to update basic room information like pricing, so that I can adjust to market conditions.

#### Acceptance Criteria

1. WHEN a property owner edits a room THEN the system SHALL display a form with current room configuration
2. WHEN the property owner updates pricing THEN the system SHALL apply changes only to that specific room
3. WHEN changes are saved THEN the system SHALL validate that no active bookings conflict with the new configuration
4. WHEN validation fails THEN the system SHALL display specific error messages and prevent the update
5. WHEN updates succeed THEN the system SHALL refresh the room list to show updated information

### Requirement 13

**User Story:** As a property owner, I want all navigation links and routes in my dashboard to work correctly, so that I can access all features without encountering broken pages.

#### Acceptance Criteria

1. WHEN a property owner clicks on any navigation link THEN the system SHALL navigate to the correct page without errors
2. WHEN a property owner accesses a route directly via URL THEN the system SHALL load the correct page
3. WHEN a route does not exist THEN the system SHALL display a 404 page with navigation back to dashboard
4. WHEN API endpoints are called from the property owner dashboard THEN the system SHALL use correct endpoint paths
5. WHEN navigation occurs THEN the system SHALL maintain user authentication state and redirect to login if session expires

## Common Correctness Patterns

### Invariants
- A room must always have a valid property reference
- A property's total room count must equal the number of associated room records
- Room numbers within a property must be unique
- A room's total bed count must match its sharing type (single=1, double=2, triple=3, quad=4)
- Occupied bed count must never exceed total bed count for a room
- Property owners can only view rooms for properties they own
- Internal users can only view rooms for properties within their data scope

### Round Trip Properties
- Creating rooms via bulk creation and then querying should return all created rooms with correct bed counts
- Updating a room's pricing and querying should reflect the new price
- Filtering rooms by floor and then clearing filters should return the original full list

### Error Conditions
- Attempting to view rooms for a property not owned by the user should fail with access denied
- Attempting to create rooms without a valid property ID should fail with validation error
- Attempting to create duplicate room numbers within a property should fail
- Attempting to update room pricing with invalid values should fail with validation error
- Attempting to load property details for a non-existent property should display appropriate error message
