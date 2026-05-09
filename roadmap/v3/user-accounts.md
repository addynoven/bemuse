# v3 — User Accounts

## Status
🟡 Important

## Problem
Scores, favorites, and history are tied to one browser.

## Solution
OAuth-based accounts (Google, GitHub, Discord).

## Tasks
- [ ] OAuth login flow
- [ ] Username + avatar
- [ ] Public profile page
- [ ] Privacy settings (hide scores, private profile)
- [ ] Guest mode (play without account)

## Backend Schema
```
users: id, username, avatar_url, created_at
scores: id, user_id, video_id, difficulty, score, accuracy, played_at
```

## Depends On
- `leaderboards.md` (v3)
