# UI/UX Rules

- Mobile-first design
- Loading states required
- Empty states required
- Error states required
- Accessible keyboard navigation
- Prevent layout shifts

## Reusable Components — Mandatory

### NumberInput

**Always** use `src/components/ui/NumberInput.tsx` instead of `<input type="number">` anywhere in the codebase.

**Why:** Native `<input type="number">` has two bugs in controlled React inputs:

1. "0 → backspace → snaps back" — because `Number("") === 0` never changes state so React re-renders `0`.
2. "0 → type 8 → 08" — appends instead of replacing.

`NumberInput` fixes both via an internal `display` state + focus-aware sync.

**Usage:**

```tsx
import NumberInput from "@/components/ui/NumberInput";

<NumberInput
  min={1}
  max={50000}
  value={amount}
  onChange={(e) =>
    setAmount(e.target.value === "" ? "" : Number(e.target.value))
  }
  placeholder="Enter amount"
  className="..."
/>;
```

All standard `<input>` props are forwarded — it is a direct drop-in replacement.
