# v2 — Word-Level Notes

## Status
🟡 Important

## Problem
One note per lyric line = too sparse for Hard/Expert.

## Solution
Use word-level timing from SDK to place notes on every word.

## Tasks
- [ ] Parse `lyrics.data.synced[].words[]` array
- [ ] Map each word to a note with sub-line timing
- [ ] Respect difficulty density cap
- [ ] Handle words without individual timing (fallback to evenly spaced)
- [ ] Highlight current lyric line during gameplay

## Example
```
Lyric: "We will, we will rock you"
Words:  ["We", "will", "we", "will", "rock", "you"]
Notes:  [ lane1, lane2, lane1, lane2, lane3, lane4 ]
```

## Depends On
- `difficulty-levels.md` (v1)
