import re
with open('index.html', 'r') as f:
    content = f.read()

content = content.replace("Top 1% (43%) &middot; Next 9% (40%) &middot; Bottom 90% (17%)", "Top 20% (71%) &middot; 21-40% (15%) &middot; 41-60% (9%)")
content = content.replace("USA ($27.3T) &middot; CHN ($17.7T) &middot; DEU ($4.4T)", "USA ($27T) &middot; CHN ($17T) &middot; Top 10 Countries")

with open('index.html', 'w') as f:
    f.write(content)
