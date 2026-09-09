import re
with open('index.html', 'r') as f:
    content = f.read()

content = content.replace('<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>', '<script src="https://cdn.jsdelivr.net/npm/chart.js/dist/chart.umd.js"></script>')

with open('index.html', 'w') as f:
    f.write(content)
