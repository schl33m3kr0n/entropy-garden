import re
with open('js/modules/mr-disco.js', 'r') as f:
    content = f.read()

content = content.replace("const pieCtx = document.getElementById('mr-disco-pie');", "document.getElementById('mr-disco-pie').style.border = '2px solid pink';\n        const pieCtx = document.getElementById('mr-disco-pie');")

with open('js/modules/mr-disco.js', 'w') as f:
    f.write(content)
