# Warehouse Management System

## Orchestrator Agent

**ALL development requests must be routed through the `warehouse-orchestrator` agent.**

When any user request involves building, changing, fixing, or reviewing any part of this app — invoke the `warehouse-orchestrator` subagent and pass the full request to it. Do not implement anything directly. The orchestrator owns the full development lifecycle.

```
User request → Agent(subagent_type="warehouse-orchestrator", prompt="<full user request>")
```

The only exception: direct file reads or git status checks for situational awareness are fine inline.

## Project

- **Stack:** React 19 + Firebase (Auth, Firestore, Storage, Analytics)
- **Plugins active:** `superpowers`, `frontend-design`
- **Firebase config:** `.env.local` — do not modify
- **Plans:** `docs/superpowers/plans/`

## Never Do

- Install packages without the orchestrator's approval
- Write Firebase rules or auth logic without a spec review
- Commit without the orchestrator completing its review cycle
