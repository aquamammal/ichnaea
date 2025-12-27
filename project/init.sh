#!/usr/bin/env bash
set -euo pipefail

npm install
npm test

echo "To run the app: pear run -d ."

node -e "const fs=require('fs'); const f=JSON.parse(fs.readFileSync('feature_list.json','utf8')); const next=f.features.find(x=>!x.status.implemented); console.log('Next feature:', next ? next.id + ' - ' + next.name : 'none');"
