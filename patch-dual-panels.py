import re
with open('index.html', 'r') as f:
    content = f.read()

pattern_html = r'<div class="stats-charts-wrapper".*?</div>\n                        </div>'

new_html = """<div class="stats-charts-wrapper" style="margin-top: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; width: 100%;">
                                <div style="display: flex; gap: 1rem; height: 160px; width: 100%;">
                                    
                                    <!-- US PANEL -->
                                    <div class="stats-chart-container" style="flex: 1; position: relative; height: 100%; display: flex; flex-direction: column;">
                                        <div style="text-align: center; font-size: 0.65rem; color: #0f0; margin-bottom: 5px; letter-spacing: 1px;">US WEALTH</div>
                                        <div style="display: flex; flex: 1; gap: 5px; width: 100%;">
                                            <div style="flex: 2; position: relative;"><canvas id="chart-us-quintiles"></canvas></div>
                                            <div style="flex: 1.2; position: relative; display: flex; flex-direction: column; align-items: center;">
                                                <span style="font-size: 0.5rem; color: var(--alert-red); margin-bottom: 2px;">1% vs 19%</span>
                                                <div style="flex: 1; width: 100%; position: relative;"><canvas id="chart-us-top1"></canvas></div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- GLOBAL PANEL -->
                                    <div class="stats-chart-container" style="flex: 1; position: relative; height: 100%; display: flex; flex-direction: column;">
                                        <div style="text-align: center; font-size: 0.65rem; color: #0f0; margin-bottom: 5px; letter-spacing: 1px;">GLOBAL WEALTH</div>
                                        <div style="display: flex; flex: 1; gap: 5px; width: 100%;">
                                            <div style="flex: 2; position: relative;"><canvas id="chart-global-quintiles"></canvas></div>
                                            <div style="flex: 1.2; position: relative; display: flex; flex-direction: column; align-items: center;">
                                                <span style="font-size: 0.5rem; color: var(--alert-red); margin-bottom: 2px;">1% vs 19%</span>
                                                <div style="flex: 1; width: 100%; position: relative;"><canvas id="chart-global-top1"></canvas></div>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                                <div class="stats-chart-container" style="height: 160px; position: relative; width: 100%;">
                                    <canvas id="mr-disco-chart"></canvas>
                                </div>
                            </div>
                        </div>"""

content = re.sub(pattern_html, new_html, content, flags=re.DOTALL)

with open('index.html', 'w') as f:
    f.write(content)


with open('js/modules/mr-disco.js', 'r') as f:
    js_content = f.read()

new_js = """
let statsChartInstance = null;
let instUsQ = null, instUs1 = null, instGlQ = null, instGl1 = null;

function renderStatsChart() {
    const barCtx = document.getElementById('mr-disco-chart');
    if (!barCtx) return;

    try {
        if (typeof window.Chart === 'undefined') return;
        
        if (statsChartInstance) statsChartInstance.destroy();
        if (instUsQ) instUsQ.destroy();
        if (instUs1) instUs1.destroy();
        if (instGlQ) instGlQ.destroy();
        if (instGl1) instGl1.destroy();
        
        window.Chart.defaults.color = '#0f0';
        if (window.Chart.defaults.font) window.Chart.defaults.font.family = 'monospace';
        
        const quintileColors = ['rgba(0,255,0,1.0)', 'rgba(0,255,0,0.6)', 'rgba(0,255,0,0.3)', 'rgba(0,255,0,0.15)', 'rgba(0,255,0,0.05)'];
        const top1Colors = ['rgba(255,0,85,0.9)', 'rgba(0,255,0,0.6)'];
        
        const qOpts = { responsive: false, maintainAspectRatio: false, plugins: { legend: { display: false }, title: { display: false } } };
        const dOpts = { responsive: false, maintainAspectRatio: false, plugins: { legend: { display: false }, title: { display: false } } };

        // US Quintiles
        instUsQ = new window.Chart(document.getElementById('chart-us-quintiles'), {
            type: 'pie', data: { labels: ['Top 20%', '2nd 20%', '3rd 20%', '4th 20%', 'Bottom 20%'], 
            datasets: [{ data: [71, 15, 9, 4, 1], backgroundColor: quintileColors, borderColor: '#0f0', borderWidth: 1 }] },
            options: qOpts
        });
        // US Top 1%
        instUs1 = new window.Chart(document.getElementById('chart-us-top1'), {
            type: 'doughnut', data: { labels: ['Top 1%', 'Next 19%'], 
            datasets: [{ data: [32, 39], backgroundColor: top1Colors, borderColor: ['var(--alert-red)', '#0f0'], borderWidth: 1 }] },
            options: dOpts
        });

        // Global Quintiles
        instGlQ = new window.Chart(document.getElementById('chart-global-quintiles'), {
            type: 'pie', data: { labels: ['Top 20%', '2nd 20%', '3rd 20%', '4th 20%', 'Bottom 20%'], 
            datasets: [{ data: [86, 11, 2, 1, 0], backgroundColor: quintileColors, borderColor: '#0f0', borderWidth: 1 }] },
            options: qOpts
        });
        // Global Top 1%
        instGl1 = new window.Chart(document.getElementById('chart-global-top1'), {
            type: 'doughnut', data: { labels: ['Top 1%', 'Next 19%'], 
            datasets: [{ data: [46, 40], backgroundColor: top1Colors, borderColor: ['var(--alert-red)', '#0f0'], borderWidth: 1 }] },
            options: dOpts
        });

        // Top 10 GDP Bar Chart
        statsChartInstance = new window.Chart(barCtx, {
            type: 'bar',
            data: {
                labels: ['USA', 'CHN', 'DEU', 'JPN', 'IND', 'GBR', 'FRA', 'ITA', 'BRA', 'CAN'],
                datasets: [{ label: 'GDP ($T)', data: [27.3, 17.7, 4.4, 4.2, 3.7, 3.3, 3.0, 2.1, 2.1, 2.1], backgroundColor: 'rgba(255, 255, 255, 0.7)', borderColor: '#fff', borderWidth: 1 }]
            },
            options: {
                responsive: false, maintainAspectRatio: false,
                plugins: { legend: { display: false }, title: { display: true, text: 'GLOBAL GDP TOP 10 ($T)', color: '#fff', font: { size: 10 } } },
                scales: { y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#fff', font: { size: 9 } } }, x: { grid: { display: false }, ticks: { color: '#fff', font: { size: 9 } } } }
            }
        });
        
    } catch (err) {
        barCtx.parentElement.innerHTML = '<div style="color:red; font-size:16px;">ERR: ' + err.message + '</div>';
    }
}
"""

js_content = re.sub(r'let statsChartInstance = null;.*', new_js.strip(), js_content, flags=re.DOTALL)

with open('js/modules/mr-disco.js', 'w') as f:
    f.write(js_content)
