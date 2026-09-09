import re
with open('js/modules/mr-disco.js', 'r') as f:
    content = f.read()

content = content.replace("window.Chart.defaults.font.family = 'monospace';", "if (window.Chart.defaults.font) window.Chart.defaults.font.family = 'monospace';")

with open('js/modules/mr-disco.js', 'w') as f:
    f.write(content)
