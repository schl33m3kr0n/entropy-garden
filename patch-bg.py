import re
with open('js/modules/mr-disco.js', 'r') as f:
    content = f.read()

content = content.replace("document.getElementById('mr-disco-pie').style.border = '2px solid pink';", "document.getElementById('mr-disco-pie').style.backgroundColor = 'rgba(0, 255, 0, 0.2)'; document.getElementById('mr-disco-chart').style.backgroundColor = 'rgba(255, 255, 255, 0.2)';")

with open('js/modules/mr-disco.js', 'w') as f:
    f.write(content)
