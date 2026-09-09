import re

with open('index.html', 'r') as f:
    content = f.read()

pattern_html = r'<div class="stats-charts-wrapper".*?</div>\n                        </div>'

new_html = """<div class="stats-charts-wrapper" style="margin-top: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; width: 100%;">
                                <div style="display: flex; gap: 1rem; height: 160px; width: 100%;">
                                    <div class="stats-chart-container" style="flex: 1; position: relative; height: 100%; display: flex; flex-direction: column;">
                                        <div style="display: flex; gap: 10px; justify-content: center; margin-bottom: 5px;">
                                            <div class="chart-toggles" style="display: flex; gap: 2px;">
                                                <button class="ui-btn region-btn active" data-region="us" style="font-size: 0.6rem; padding: 2px 6px;">US</button>
                                                <button class="ui-btn region-btn" data-region="global" style="font-size: 0.6rem; padding: 2px 6px;">GLOBAL</button>
                                            </div>
                                            <div style="width: 1px; background: rgba(0,255,0,0.3); height: 100%;"></div>
                                            <div class="chart-toggles" style="display: flex; gap: 2px;">
                                                <button class="ui-btn type-btn active" data-type="pie" style="font-size: 0.6rem; padding: 2px 6px;">PIE</button>
                                                <button class="ui-btn type-btn" data-type="doughnut" style="font-size: 0.6rem; padding: 2px 6px;">RING</button>
                                                <button class="ui-btn type-btn" data-type="polarArea" style="font-size: 0.6rem; padding: 2px 6px;">POLAR</button>
                                            </div>
                                        </div>
                                        
                                        <div style="display: flex; flex: 1; gap: 5px; width: 100%;">
                                            <div style="flex: 2; position: relative;"><canvas id="chart-quintiles"></canvas></div>
                                            <div style="flex: 1.2; position: relative; display: flex; flex-direction: column; align-items: center;">
                                                <span style="font-size: 0.5rem; color: var(--alert-red); margin-bottom: 2px; text-align: center;">1% BREAKDOWN</span>
                                                <div style="flex: 1; width: 100%; position: relative;"><canvas id="chart-top1"></canvas></div>
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
let instQ = null;
let inst1 = null;
let currentPieType = 'pie';
let currentRegion = 'us';

const wealthData = {
    us: { quintiles: [71, 15, 9, 4, 1], top1: [5, 9, 18] },
    global: { quintiles: [86, 11, 2, 1, 0], top1: [11, 15, 20] }
};

function updateWealthCharts() {
    if (!instQ || !inst1) return;
    instQ.config.type = currentPieType;
    instQ.data.datasets[0].data = wealthData[currentRegion].quintiles;
    instQ.update();
    
    inst1.data.datasets[0].data = wealthData[currentRegion].top1;
    inst1.update();
}

function renderStatsChart() {
    const qCtx = document.getElementById('chart-quintiles');
    const tCtx = document.getElementById('chart-top1');
    const barCtx = document.getElementById('mr-disco-chart');
    if (!qCtx || !tCtx || !barCtx) return;

    try {
        if (typeof window.Chart === 'undefined') return;
        
        if (statsChartInstance) statsChartInstance.destroy();
        if (instQ) instQ.destroy();
        if (inst1) inst1.destroy();
        
        window.Chart.defaults.color = '#0f0';
        if (window.Chart.defaults.font) window.Chart.defaults.font.family = 'monospace';
        
        const quintileColors = ['rgba(0,255,0,1.0)', 'rgba(0,255,0,0.6)', 'rgba(0,255,0,0.3)', 'rgba(0,255,0,0.15)', 'rgba(0,255,0,0.05)'];
        const top1Colors = ['#ff0055', '#cc0044', '#990033'];
        
        const qOpts = { responsive: false, maintainAspectRatio: false, plugins: { legend: { display: false }, title: { display: false } } };
        const dOpts = { responsive: false, maintainAspectRatio: false, plugins: { legend: { display: false }, title: { display: false } } };

        // Quintiles
        instQ = new window.Chart(qCtx, {
            type: currentPieType, data: { labels: ['Top 20%', '2nd 20%', '3rd 20%', '4th 20%', 'Bottom 20%'], 
            datasets: [{ data: wealthData[currentRegion].quintiles, backgroundColor: quintileColors, borderColor: '#0f0', borderWidth: 1 }] },
            options: qOpts
        });
        
        // Top 1% Breakdown
        inst1 = new window.Chart(tCtx, {
            type: 'doughnut', data: { labels: ['Top 0.01%', 'Next 0.09%', 'Next 0.9%'], 
            datasets: [{ data: wealthData[currentRegion].top1, backgroundColor: top1Colors, borderColor: 'var(--alert-red)', borderWidth: 1 }] },
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
        
        // Region Toggle
        document.querySelectorAll('.region-btn:not(.bound)').forEach(btn => {
            btn.classList.add('bound');
            btn.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                document.querySelectorAll('.region-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentRegion = btn.dataset.region;
                updateWealthCharts();
            });
        });

        // Type Toggle
        document.querySelectorAll('.type-btn:not(.bound)').forEach(btn => {
            btn.classList.add('bound');
            btn.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentPieType = btn.dataset.type;
                updateWealthCharts();
            });
        });
        
    } catch (err) {
        barCtx.parentElement.innerHTML = '<div style="color:red; font-size:16px;">ERR: ' + err.message + '</div>';
    }
}
"""

js_content = re.sub(r'let statsChartInstance = null;.*', new_js.strip(), js_content, flags=re.DOTALL)

with open('js/modules/mr-disco.js', 'w') as f:
    f.write(js_content)
