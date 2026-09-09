import re
with open('index.html', 'r') as f:
    content = f.read()

old_html = """                                <div class="stats-chart-container" style="flex: 1; position: relative; height: 100%;">
                                    <canvas id="mr-disco-pie" width="200" height="160"></canvas>
                                </div>"""

new_html = """                                <div class="stats-chart-container" style="flex: 1; position: relative; height: 100%; display: flex; flex-direction: column;">
                                    <div class="chart-toggles" style="display: flex; gap: 5px; justify-content: center; margin-bottom: 5px;">
                                        <button class="ui-btn chart-btn active" data-type="pie" style="font-size: 0.6rem; padding: 2px 6px;">PIE</button>
                                        <button class="ui-btn chart-btn" data-type="doughnut" style="font-size: 0.6rem; padding: 2px 6px;">RING</button>
                                        <button class="ui-btn chart-btn" data-type="polarArea" style="font-size: 0.6rem; padding: 2px 6px;">POLAR</button>
                                    </div>
                                    <div style="flex: 1; position: relative; width: 100%;">
                                        <canvas id="mr-disco-pie" width="200" height="130"></canvas>
                                    </div>
                                </div>"""

content = content.replace(old_html, new_html)

with open('index.html', 'w') as f:
    f.write(content)
