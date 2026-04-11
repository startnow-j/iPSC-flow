#!/bin/bash
# Detach from terminal completely and start Next.js dev server
cd /home/z/my-project

# Double-fork to completely detach
(
  exec node /home/z/my-project/node_modules/.bin/next dev -p 3000 \
    > /home/z/my-project/dev.log 2>&1
) &
disown
echo "Server started"
