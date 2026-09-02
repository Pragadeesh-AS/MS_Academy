const fs = require('fs'); 
let c = fs.readFileSync('src/components/AdminDashboard.jsx', 'utf8'); 
c = c.replace(/\\'/g, "'"); 
fs.writeFileSync('src/components/AdminDashboard.jsx', c);
