"""
Lightweight desktop behavior tracker: idle, sleep detection, active time.
Sends to POST /api/behavior/system every 5 minutes. Runs in background; does not crash if backend unavailable.
Uses: psutil, time, os, platform. Optional: ctypes on Windows for idle.
"""
import os
import platform
import time
import urllib.request
import urllib.error
import json

try:
    import psutil
except ImportError:
    psutil = None

# Config from env (no hardcoded secrets)
API_BASE = os.environ.get("MINDPAL_API_BASE", "http://127.0.0.1:8000/api")
AUTH_TOKEN = os.environ.get("MINDPAL_AUTH_TOKEN", "")
SEND_INTERVAL_SEC = 300  # 5 minutes
SLEEP_GAP_SEC = 30 * 60  # 30 min gap => sleep_detected
IDLE_THRESHOLD_SEC = 5 * 60  # 5 min idle

_last_send_time = 0.0
_initial_time = time.time()


def _get_idle_seconds() -> float:
    """Platform-specific idle time in seconds. 0 if unavailable."""
    system = platform.system()
    if system == "Windows":
        try:
            from ctypes import Structure, windll, c_uint, sizeof, byref
            class LASTINPUTINFO(Structure):
                _fields_ = [("cbSize", c_uint), ("dwTime", c_uint)]
            lii = LASTINPUTINFO()
            lii.cbSize = sizeof(lii)
            windll.user32.GetLastInputInfo(byref(lii))
            millis = windll.kernel32.GetTickCount() - lii.dwTime
            return millis / 1000.0
        except Exception:
            return 0.0
    # Linux/macOS: no ctypes X11/Quartz here to avoid deps; use 0 (active assumed)
    return 0.0


def _send_system_payload(payload: dict) -> bool:
    """POST to backend. Returns True if sent successfully."""
    if not AUTH_TOKEN:
        return False
    try:
        req = urllib.request.Request(
            f"{API_BASE.rstrip('/')}/behavior/system",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {AUTH_TOKEN}",
            },
            method="POST",
        )
        urllib.request.urlopen(req, timeout=10)
        return True
    except urllib.error.URLError:
        return False
    except Exception:
        return False


def _run_once():
    global _last_send_time
    now = time.time()
    elapsed = now - _last_send_time if _last_send_time else SEND_INTERVAL_SEC
    sleep_detected = elapsed >= SLEEP_GAP_SEC and _last_send_time > 0
    interval_min = SEND_INTERVAL_SEC / 60.0
    idle_sec = _get_idle_seconds()
    idle_min = min(interval_min, idle_sec / 60.0)
    active_min = max(0.0, interval_min - idle_min) if not sleep_detected else 0.0
    if sleep_detected:
        # Long gap: treat as system sleep / session end
        active_min = 0.0
        idle_min = interval_min
    payload = {
        "system_active_minutes": round(active_min, 1),
        "system_idle_minutes": round(idle_min, 1),
        "sleep_detected": sleep_detected,
        "timestamp": now,
    }
    success = _send_system_payload(payload)
    _last_send_time = now
    return success


def main():
    global _last_send_time
    _last_send_time = time.time()
    while True:
        try:
            _run_once()
        except Exception:
            pass
        time.sleep(SEND_INTERVAL_SEC)


if __name__ == "__main__":
    main()
