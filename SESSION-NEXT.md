# Session Next

## Start here next time

**Next concrete task:** implement **save/load event history** for the browser demo.

### Why this next
It is the highest-value next step because it turns the current in-memory prototype into something resumable and inspectable.
It also creates the bridge for later TOON import/export.

### Minimum scope
- export current event stream from browser demo
- import a saved event stream back into the demo
- JSON is enough first
- keep replay as the source of truth

### After that
1. TOON export/import
2. Branch creation + branch switcher
3. Connect nodes from UI

### Quick resume
In `D:\Replayabl`:

```bash
npm install
npm run dev
```

Verify current demo still supports:
- create node
- edit text
- drag node
- proposal preview
- approve/reject proposal
