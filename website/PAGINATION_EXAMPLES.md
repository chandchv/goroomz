# Pagination Visual Examples

## Before (Old System)
```
[1] [2] [3] [4] [5] [6] [7] [8] [9] [10] [11] [12] [13] [14] [15] [16] [17] [18] [19] [20] [21] [22] [23] [24] [25] [26] [27] [28] [29] [30] [31] [32] [33] [34] [35] [36] [37] [38] [39] [40] [41] [42] [43] [44] [45] [46] [47] [48] [49] [50] [51] [52] [53] [54] [55] [56] [57] [58] [59] [60] [61] [62] [63] [64] [65] [66] [67] [68] [69] [70]
```
❌ **Problem**: All 70 buttons overflow the page width!

---

## After (New System)

### Scenario 1: On Page 1
```
[⏮ First] [◀ Previous] [1] [2] [3] [4] [5] ... [70] [Next ▶] [Last ⏭]
                        ^^^
```

### Scenario 2: On Page 5
```
[⏮ First] [◀ Previous] [1] [2] [3] [4] [5] [6] [7] ... [70] [Next ▶] [Last ⏭]
                                        ^^^
```

### Scenario 3: On Page 35 (Middle)
```
[⏮ First] [◀ Previous] [1] ... [34] [35] [36] ... [70] [Next ▶] [Last ⏭]
                                     ^^^^
```

### Scenario 4: On Page 68
```
[⏮ First] [◀ Previous] [1] ... [64] [65] [66] [67] [68] [69] [70] [Next ▶] [Last ⏭]
                                                      ^^^^
```

### Scenario 5: On Page 70 (Last)
```
[⏮ First] [◀ Previous] [1] ... [64] [65] [66] [67] [68] [69] [70] [Next ▶] [Last ⏭]
                                                             ^^^^
```

✅ **Solution**: Maximum 7 page numbers + navigation = Clean, compact UI!

---

## Mobile View (Responsive)

```
[◀ Previous] [1] ... [35] [36] [37] ... [70] [Next ▶]
```
- Hides First/Last buttons
- Hides "Previous"/"Next" text labels
- Shows only icons

---

## Features Demonstrated

1. **Smart Ellipsis**: Shows "..." when pages are hidden
2. **Current Page Highlight**: Active page in purple
3. **Disabled States**: First/Previous disabled on page 1
4. **Responsive**: Adapts to screen size
5. **Page Info**: "Page 35 of 70" on desktop

---

## Color Scheme

- **Active Page**: Purple background (#7C3AED)
- **Inactive Pages**: White with border
- **Hover**: Light gray background
- **Disabled**: 50% opacity, no pointer

---

## Accessibility

- ✅ Keyboard navigation (Tab, Enter)
- ✅ Screen reader friendly
- ✅ Clear disabled states
- ✅ Descriptive titles on buttons
- ✅ Proper ARIA labels
