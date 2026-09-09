with open('js/modules/mr-disco.js', 'r') as f:
    content = f.read()
content = content.replace("if (typeof Chart === 'undefined') return;", "if (typeof Chart === 'undefined') { document.getElementById('mr-disco-chart').outerHTML = '<p style=\"color:red;\">Chart library failed to load.</p>'; return; }")
with open('js/modules/mr-disco.js', 'w') as f:
    f.write(content)
