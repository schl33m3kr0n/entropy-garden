with open('js/modules/mr-disco.js', 'r') as f:
    content = f.read()

content = content.replace("if (!stats.hidden) renderStatsChart();", "if (!stats.hidden) requestAnimationFrame(() => requestAnimationFrame(renderStatsChart));")

with open('js/modules/mr-disco.js', 'w') as f:
    f.write(content)

