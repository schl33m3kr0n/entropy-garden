import re
with open('js/modules/mr-disco.js', 'r') as f:
    content = f.read()

content = content.replace("responsive: true,", "responsive: false,")
content = content.replace("maintainAspectRatio: false,", "maintainAspectRatio: false,")

with open('js/modules/mr-disco.js', 'w') as f:
    f.write(content)
