import re
with open('js/modules/mr-disco.js', 'r') as f:
    content = f.read()

content = content.replace("requestAnimationFrame(() => requestAnimationFrame(renderStatsChart));", "setTimeout(renderStatsChart, 50);")

with open('js/modules/mr-disco.js', 'w') as f:
    f.write(content)
