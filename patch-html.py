with open('index.html', 'r') as f:
    content = f.read()

old_html = """                            <div class="stats-chart-container" style="margin-top: 1.5rem; position: relative; height: 160px; width: 100%;">
                                <canvas id="mr-disco-chart" width="400" height="160"></canvas>
                            </div>"""

new_html = """                            <div class="stats-charts-wrapper" style="margin-top: 1.5rem; display: flex; gap: 1rem; height: 160px; width: 100%;">
                                <div class="stats-chart-container" style="flex: 1; position: relative; height: 100%;">
                                    <canvas id="mr-disco-pie" width="200" height="160"></canvas>
                                </div>
                                <div class="stats-chart-container" style="flex: 1; position: relative; height: 100%;">
                                    <canvas id="mr-disco-chart" width="200" height="160"></canvas>
                                </div>
                            </div>"""

content = content.replace(old_html, new_html)

with open('index.html', 'w') as f:
    f.write(content)
