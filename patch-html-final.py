import re
with open('index.html', 'r') as f:
    content = f.read()

# Match the old container regardless of inner canvas styling
pattern = r'<div class="stats-chart-container" style="margin-top: 1\.5rem; position: relative; height: 160px; width: 100%;">.*?</div>'

new_html = """<div class="stats-charts-wrapper" style="margin-top: 1.5rem; display: flex; gap: 1rem; height: 160px; width: 100%;">
                                <div class="stats-chart-container" style="flex: 1; position: relative; height: 100%; display: flex; flex-direction: column;">
                                    <div class="chart-toggles" style="display: flex; gap: 5px; justify-content: center; margin-bottom: 5px;">
                                        <button class="ui-btn chart-btn active" data-type="pie" style="font-size: 0.6rem; padding: 2px 6px;">PIE</button>
                                        <button class="ui-btn chart-btn" data-type="doughnut" style="font-size: 0.6rem; padding: 2px 6px;">RING</button>
                                        <button class="ui-btn chart-btn" data-type="polarArea" style="font-size: 0.6rem; padding: 2px 6px;">POLAR</button>
                                    </div>
                                    <div style="flex: 1; position: relative; width: 100%;">
                                        <canvas id="mr-disco-pie" width="200" height="130"></canvas>
                                    </div>
                                </div>
                                <div class="stats-chart-container" style="flex: 1; position: relative; height: 100%;">
                                    <canvas id="mr-disco-chart" width="200" height="160"></canvas>
                                </div>
                            </div>"""

content = re.sub(pattern, new_html, content, flags=re.DOTALL)

with open('index.html', 'w') as f:
    f.write(content)
