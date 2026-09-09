import re
with open('index.html', 'r') as f:
    content = f.read()

content = content.replace("Top 20% (71%) &middot; 21-40% (15%) &middot; 41-60% (9%)", "US (Top 1%: 32%) &middot; GLOBAL (Top 1%: 46%)")

with open('index.html', 'w') as f:
    f.write(content)
