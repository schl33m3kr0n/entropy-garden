import re
with open('index.html', 'r') as f:
    content = f.read()

pattern = r'<div class="stats-charts-wrapper" style="margin-top: 1\.5rem; display: flex; gap: 1rem; height: 160px; width: 100%;">.*?</div>\n                        </div>'

new_html = """<div class="stats-charts-wrapper" style="margin-top: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; width: 100%;">
                                <div style="display: flex; gap: 1rem; height: 180px; width: 100%;">
                                    <div class="stats-chart-container" style="flex: 3; position: relative; height: 100%; display: flex; flex-direction: column;">
                                        <div class="chart-toggles" style="display: flex; gap: 5px; justify-content: center; margin-bottom: 5px;">
                                            <button class="ui-btn chart-btn active" data-type="pie" style="font-size: 0.6rem; padding: 2px 6px;">PIE</button>
                                            <button class="ui-btn chart-btn" data-type="doughnut" style="font-size: 0.6rem; padding: 2px 6px;">RING</button>
                                            <button class="ui-btn chart-btn" data-type="polarArea" style="font-size: 0.6rem; padding: 2px 6px;">POLAR</button>
                                        </div>
                                        <div style="flex: 1; position: relative; width: 100%;">
                                            <canvas id="mr-disco-pie"></canvas>
                                        </div>
                                    </div>
                                    <div class="stats-chart-container" style="flex: 2; position: relative; height: 100%; display: flex; flex-direction: column;">
                                        <div style="text-align: center; font-size: 0.6rem; color: #0f0; margin-bottom: 5px;">TOP 1% SUBGRAPH</div>
                                        <div style="flex: 1; position: relative; width: 100%;">
                                            <canvas id="mr-disco-subgraph"></canvas>
                                        </div>
                                    </div>
                                </div>
                                <div class="stats-chart-container" style="height: 180px; position: relative; width: 100%;">
                                    <canvas id="mr-disco-chart"></canvas>
                                </div>
                            </div>
                        </div>"""

content = re.sub(pattern, new_html, content, flags=re.DOTALL)

with open('index.html', 'w') as f:
    f.write(content)
