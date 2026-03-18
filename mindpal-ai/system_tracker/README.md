# MindPal System Tracker (optional)

Lightweight desktop helper that sends system activity to MindPal every 5 minutes.

- **Idle time**: Windows (keyboard/mouse inactivity); other platforms report active.
- **Sleep detection**: Long gaps between sends are reported as `sleep_detected`.
- **Env**: `MINDPAL_API_BASE` (default `http://127.0.0.1:8000/api`), `MINDPAL_AUTH_TOKEN` (your JWT).

Run (optional):

```bash
export MINDPAL_AUTH_TOKEN="your-jwt-token"
python tracker.py
```

Runs in foreground; safe to run in background. Does not crash if the backend is unavailable.
