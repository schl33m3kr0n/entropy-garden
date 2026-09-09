with open('index.html', 'r') as f:
    content = f.read()
content = content.replace('<canvas id="mr-disco-chart" width="400" height="160"></canvas>', '<canvas id="mr-disco-chart" width="400" height="160" style="background: rgba(255,0,0,0.2);"></canvas>')
with open('index.html', 'w') as f:
    f.write(content)
