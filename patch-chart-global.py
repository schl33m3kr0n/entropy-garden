import re
with open('js/modules/mr-disco.js', 'r') as f:
    content = f.read()

content = content.replace("typeof Chart === 'undefined'", "typeof window.Chart === 'undefined'")
content = content.replace("statsPieInstance = new Chart", "statsPieInstance = new window.Chart")
content = content.replace("statsChartInstance = new Chart", "statsChartInstance = new window.Chart")
content = content.replace("Chart.defaults", "window.Chart.defaults")

with open('js/modules/mr-disco.js', 'w') as f:
    f.write(content)
