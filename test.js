import fs from 'fs';
let content = fs.readFileSync('js/modules/mr-disco.js', 'utf8');
content = content.replace("if (typeof Chart === 'undefined') return;", "if (typeof Chart === 'undefined') { document.getElementById('mr-disco-chart').outerHTML = '<p style=\"color:red;\">Chart library failed to load.</p>'; return; }");
fs.writeFileSync('js/modules/mr-disco.js', content);
