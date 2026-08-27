const fs = require('fs');
const path = require('path');

const source = path.join(__dirname, 'frontend', 'public');
const destination = path.join(__dirname, 'dist');

fs.rmSync(destination, { recursive: true, force: true });
fs.cpSync(source, destination, { recursive: true });