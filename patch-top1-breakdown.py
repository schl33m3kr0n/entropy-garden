import re

with open('index.html', 'r') as f:
    content = f.read()

content = content.replace("1% vs 19%", "1% BREAKDOWN")

with open('index.html', 'w') as f:
    f.write(content)


with open('js/modules/mr-disco.js', 'r') as f:
    js_content = f.read()

# Replace US Top 1% config
old_us = """instUs1 = new window.Chart(document.getElementById('chart-us-top1'), {
            type: 'doughnut', data: { labels: ['Top 1%', 'Next 19%'], 
            datasets: [{ data: [32, 39], backgroundColor: top1Colors, borderColor: ['var(--alert-red)', '#0f0'], borderWidth: 1 }] },
            options: dOpts
        });"""

new_us = """instUs1 = new window.Chart(document.getElementById('chart-us-top1'), {
            type: 'doughnut', data: { labels: ['Top 0.01%', 'Next 0.09%', 'Next 0.9%'], 
            datasets: [{ data: [5, 9, 18], backgroundColor: ['#ff0055', '#cc0044', '#990033'], borderColor: 'var(--alert-red)', borderWidth: 1 }] },
            options: dOpts
        });"""

js_content = js_content.replace(old_us, new_us)

# Replace Global Top 1% config
old_gl = """instGl1 = new window.Chart(document.getElementById('chart-global-top1'), {
            type: 'doughnut', data: { labels: ['Top 1%', 'Next 19%'], 
            datasets: [{ data: [46, 40], backgroundColor: top1Colors, borderColor: ['var(--alert-red)', '#0f0'], borderWidth: 1 }] },
            options: dOpts
        });"""

new_gl = """instGl1 = new window.Chart(document.getElementById('chart-global-top1'), {
            type: 'doughnut', data: { labels: ['Top 0.01%', 'Next 0.09%', 'Next 0.9%'], 
            datasets: [{ data: [11, 15, 20], backgroundColor: ['#ff0055', '#cc0044', '#990033'], borderColor: 'var(--alert-red)', borderWidth: 1 }] },
            options: dOpts
        });"""

js_content = js_content.replace(old_gl, new_gl)

with open('js/modules/mr-disco.js', 'w') as f:
    f.write(js_content)
