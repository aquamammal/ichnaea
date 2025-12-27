#!/usr/bin/env bash
set -euo pipefail

npm install
npm test

echo "To run the app: pear run -d ."

node -e "const fs=require('fs'); const f=JSON.parse(fs.readFileSync('project/features.json','utf8')); const next=f.find(x=>!x.implemented); console.log('Next feature:', next ? next.id + ' - ' + next.name : 'none');"
