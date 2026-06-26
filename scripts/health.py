#!/usr/bin/env python3
"""Quick health check script for AiQuran backend."""
import urllib.request, sys, os

def check():
    try:
        r = urllib.request.urlopen("http://localhost:8000/health", timeout=5)
        return r.status == 200
    except:
        return False

if __name__ == "__main__":
    sys.exit(0 if check() else 1)
