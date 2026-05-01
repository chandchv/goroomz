# Security Deposit Check-In Fixes

## Summary
Fixed the duplicate security deposit error during check-in and improved the UX by pre-populating existing security deposit information in the check-in form.

## Issues Fixed

### 1. Duplicate Security Deposit Error ✅ FIXED
**Problem**: 
- Check-in process was trying to create a new security deposit even when one already existed
- Database has unique constraint on `booking_id` in `security_deposits` table
- Error: `duplicate key value violates unique constraint "security_deposits_booking_id_key"`

**Root Cause**:
- No check for existing security deposit before creation
- Security deposits could be created during booking creation (for PG bookings)
- Check-in process blindly tried to create another deposit

**Solution**:
- Added check for existing security deposit before creation in check-in endpoint
- If deposit exists, update it instead of creating new one
- Applied same fix to deposits endpoint for consistency

### 2. Missing Booking Retrieval Endpoint ✅ FIXED
**Problem**: Frontend calling `/api/internal/bookings/:id` but endpoint didn't exist

**Solution**: Added new GET endpoint to fetch individual booking with all associations including security deposit

### 3. Security Deposit Pre-population ✅ FIXED
**Problem**: Check-in form always showed empty security deposit fields, even when deposit was already collected

**Solution**: 
- Pre-populate security deposit fields when booking already has a deposit
- Make fields read-only when deposit exists
- Show clear indicator that deposit was already collected

## Backend Changes

### 1. Check-In Endpoint (`POST /api/internal/bookings/:id/checkin`)
**File**: `backend/routes/internal/bookings.js`

**Before**:
```javascript
// Always tried to create new deposit
if (securityDepositAmount && securityDepositAmount > 0) {
  securityDeposit = await SecurityDeposit.create({
    bookingId: booking.id,
    amount: securityDepositAmount,
    // ...
  });
}
```

**After**:
```javascript
// Check if deposit exists first
if (securityDepositAmount && securityDepositAmount > 0) {
  const existingDeposit = await SecurityDeposit.findOne({
    where: { bookingId: booking.id }
  });

  if (existingDeposit) {
    // Update existing deposit
    securityDeposit = existingDeposit;
    await existingDeposit.update({
      amount: securityDepositAmount,
      paymentMethod: securityDepositMethod || existingDeposit.paymentMethod,
      notes: notes || existingDeposit.notes
    });
  } else {
    // Create new deposit
    securityDeposit = await SecurityDeposit.create({
      bookingId: booking.id,
      amount: securityDepositAmount,
      // ...
    });
  }
}
```

### 2. New Booking Retrieval Endpoint
**Endpoint**: `GET /api/internal/bookings/:id`
**File**: `backend/routes/internal/bookings.js`

**Features**:
- Fetches single booking by ID
- Includes all associations (room, user, bed, security deposit, etc.)
- Respects data scoping for access control
- Returns security deposit details if exists

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "booking-uuid",
    "roomId": "room-uuid",
    "checkIn": "2025-01-01",
    "checkOut": "2025-01-31",
    "status": "confirmed",
    "securityDeposit": {
      "id": "deposit-uuid",
      "amount": 5000,
      "status": "collected",
      "paymentMethod": "cash",
      "collectedDate": "2024-12-20",
      "notes": "Security deposit for PG booking"
    },
    "room": { ... },
    "user": { ... }
  }
}
```

### 3. Deposits Endpoint Fix
**File**: `backend/routes/internal/deposits.js`

Applied same logic to prevent duplicate deposits when using the deposits endpoint directly.

## Frontend Changes

### 1. CheckInPage.tsx - Pre-population Logic
**File**: `internal-management/app/pages/CheckInPage.tsx`

**Added useEffect**:
```typescript
useEffect(() => {
  if (booking?.securityDeposit) {
    console.log('📋 Pre-populating security deposit from existing booking');
    setSecurityDepositAmount(booking.securityDeposit.amount.toString());
    setSecurityDepositMethod(booking.securityDeposit.paymentMethod as any);
  } else {
    setSecurityDepositAmount('');
    setSecurityDepositMethod('cash');
  }
}, [booking]);
```

### 2. CheckInPage.tsx - UI Improvements
**Enhanced Security Deposit Section**:

1. **Header Update**: Shows "(Already Collected)" when deposit exists
2. **Info Banner**: Green banner showing existing deposit details
3. **Disabled Fields**: Amount and payment method fields are read-only when deposit exists
4. **Visual Indicators**: Gray background and helper text for disabled fields

**UI Elements Added**:
- ✅ Success icon with "Security deposit already collected" message
- Display of existing deposit amount, method, and collection date
- Helper text: "Using existing deposit amount"

### 3. BookingService.ts - Interface Update
**File**: `internal-management/app/services/bookingService.ts`

**Enhanced Booking Interface**:
```typescript
securityDeposit?: {
  id: string;
  amount: number;
  status: string;
  paymentMethod: string;
  collectedDate: string;
  notes?: string;
};
```

### 4. Check-In Logic Update
**Smart Deposit Handling**:
```typescript
// Only send deposit data if booking doesn't already have one
if (securityDepositAmount && parseFloat(securityDepositAmount) > 0) {
  if (!booking.securityDeposit) {
    checkInData.securityDepositAmount = parseFloat(securityDepositAmount);
    checkInData.securityDepositMethod = securityDepositMethod;
  }
}
```

## User Experience Improvements

### Before Fix:
1. User creates booking with security deposit
2. User goes to check-in page
3. Form shows empty security deposit fields
4. User enters deposit amount again
5. **ERROR**: Duplicate key constraint violation
6. Check-in fails

### After Fix:
1. User creates booking with security deposit
2. User goes to check-in page
3. Form shows **pre-filled** security deposit fields
4. Green banner indicates deposit already collected
5. Fields are **read-only** (can't be changed)
6. User proceeds with check-in
7. ✅ Check-in succeeds without errors

## Database Constraints

### Security Deposits Table
```sql
CREATE TABLE security_deposits (
  id UUID PRIMARY KEY,
  booking_id UUID UNIQUE NOT NULL,  -- UNIQUE constraint prevents duplicates
  amount DECIMAL NOT NULL,
  collected_date TIMESTAMP,
  payment_method VARCHAR,
  status VARCHAR,
  notes TEXT,
  FOREIGN KEY (booking_id) REFERENCES bookings(id)
);
```

The UNIQUE constraint on `booking_id` ensures:
- One booking can only have one security deposit
- Prevents accidental duplicate deposits
- Enforces data integrity

## Testing Scenarios

### Scenario 1: New Booking Without Deposit
1. Create booking without security deposit
2. Go to check-in page
3. Enter security deposit amount
4. Complete check-in
5. ✅ Deposit created successfully

### Scenario 2: Booking With Existing Deposit
1. Create booking with security deposit (₹5000)
2. Go to check-in page
3. See pre-filled deposit amount (₹5000)
4. Fields are read-only
5. Complete check-in
6. ✅ Check-in succeeds, existing deposit used

### Scenario 3: Update Deposit Amount
1. Booking has deposit of ₹5000
2. Try to check-in with different amount (₹6000)
3. Backend updates existing deposit to ₹6000
4. ✅ No duplicate error, deposit updated

## Error Handling

### Backend Error Handling
- Checks for existing deposits before creation
- Updates existing deposits instead of creating duplicates
- Proper logging for debugging
- Graceful error messages

### Frontend Error Handling
- Pre-populates fields to prevent user confusion
- Disables fields when deposit exists
- Clear visual indicators
- Prevents sending duplicate deposit data

## Security Considerations

### Data Validation
- Amount validation (must be positive)
- Payment method validation
- Booking ownership verification through data scoping

### Access Control
- Only authorized users can process check-ins
- Data scoping ensures users only access their properties
- Proper authentication required for all endpoints

## Performance Impact

### Minimal Performance Impact
- One additional database query to check for existing deposit
- Query is fast (indexed on booking_id)
- Prevents error handling overhead
- Better user experience

## Date
December 22, 2025

## Files Modified
- `backend/routes/internal/bookings.js` (check-in endpoint, new GET endpoint)
- `backend/routes/internal/deposits.js` (deposit creation logic)
- `internal-management/app/pages/CheckInPage.tsx` (UI and pre-population)
- `internal-management/app/services/bookingService.ts` (interface update)

## Related Issues Fixed
- ✅ Duplicate security deposit error
- ✅ Missing booking retrieval endpoint
- ✅ Poor UX with empty deposit fields
- ✅ Confusion about existing deposits