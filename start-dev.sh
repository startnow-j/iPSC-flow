#!/bin/bash
while true; do
  echo "[$(date)] Starting Next.js dev server..." >> /home/z/my-project/dev-loop.log
  node_modules/.bin/next dev -p 3000 2>&1 | tee -a /home/z/my-project/dev-loop.log
  echo "[$(date)] Server exited with code $?, restarting in 3s..." >> /home/z/my-project/dev-loop.log
  sleep 3
done
