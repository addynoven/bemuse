# v3 — Multiplayer (Online)

## Status
🟢 Nice to have (stretch)

## Problem
Friends can't play together remotely.

## Solution
WebRTC or WebSocket-based real-time versus.

## Tasks
- [ ] Matchmaking lobby
- [ ] Sync gameplay across clients (clock synchronization)
- [ ] Show opponent's score in real-time
- [ ] Spectator mode
- [ ] Ranked mode with ELO

## Technical Notes
- WebRTC data channels for low-latency input sync
- Or WebSocket with client-side prediction
- Need signaling server

## Depends On
- `user-accounts.md` (v3)
