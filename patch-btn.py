import re
with open('js/modules/mr-disco.js', 'r') as f:
    content = f.read()

content = content.replace("document.querySelectorAll('.chart-btn').forEach(btn => {\\n            btn.addEventListener('click'", "document.querySelectorAll('.chart-btn:not(.bound)').forEach(btn => {\\n            btn.classList.add('bound');\\n            btn.addEventListener('click'")

with open('js/modules/mr-disco.js', 'w') as f:
    f.write(content)
