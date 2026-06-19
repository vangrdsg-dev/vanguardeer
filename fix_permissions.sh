#!/bin/bash
chmod 644 /Users/azamahmad/Claude/Projects/Vanguardeer/index.html
echo "Permissions fixed. Re-running patch..."
cd /Users/azamahmad/Claude/Projects/Vanguardeer && python3 patch_week1.py
