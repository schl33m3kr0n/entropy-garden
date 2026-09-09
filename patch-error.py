import re
with open('js/modules/mr-disco.js', 'r') as f:
    content = f.read()

content = content.replace("console.error(err);", "document.getElementById('mr-disco-pie').outerHTML = '<p style=\"color:red; font-size:12px; word-wrap:break-word;\">' + err.toString() + '</p>';")

with open('js/modules/mr-disco.js', 'w') as f:
    f.write(content)
