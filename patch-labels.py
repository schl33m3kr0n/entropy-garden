import re
with open('js/modules/mr-disco.js', 'r') as f:
    js = f.read()

new_js = r"""
let statsChartInstance = null;
let instQ = null;
let inst1 = null;
let currentPieType = 'pie';
let currentRegion = 'us';

const wealthData = {
    us: {
        quintiles: [71, 15, 9, 4, 1],
        top1: [5, 9, 18],
        incomes: ['$250K+', '~$100K', '~$68K', '~$42K', '~$15K']
    },
    global: {
        quintiles: [86, 11, 2, 1, 0],
        top1: [11, 15, 20],
        incomes: ['$50K+', '~$10K', '~$3K', '~$1K', '~$200']
    }
};

const pctLabelPlugin = {
    id: 'pctLabels',
    afterDatasetsDraw(chart) {
        const ctx = chart.ctx;
        chart.data.datasets.forEach((dataset, i) => {
            const meta = chart.getDatasetMeta(i);
            meta.data.forEach((element, index) => {
                const val = dataset.data[index];
                if (val < 2) return;
                const pos = element.tooltipPosition();
                ctx.save();
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 9px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(val + '%', pos.x, pos.y);
                ctx.restore();
            });
        });
    }
};

function updateWealthCharts() {
    if (!instQ || !inst1) return;
    const d = wealthData[currentRegion];
    instQ.config.type = currentPieType;
    instQ.data.datasets[0].data = d.quintiles;
    instQ.data.labels = d.quintiles.map((v, i) => {
        const labels = ['Top 20%', '2nd 20%', '3rd 20%', '4th 20%', 'Bottom 20%'];
        return labels[i] + ' (' + d.incomes[i] + ')';
    });
    instQ.update();
    
    inst1.data.datasets[0].data = d.top1;
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
        const d = wealthData[currentRegion];
        
        // Quintiles
        instQ = new window.Chart(qCtx, {
            type: currentPieType,
            data: {
                labels: d.quintiles.map((v, i) => {
                    const labels = ['Top 20%', '2nd 20%', '3rd 20%', '4th 20%', 'Bottom 20%'];
                    return labels[i] + ' (' + d.incomes[i] + ')';
                }),
                datasets: [{ data: d.quintiles, backgroundColor: quintileColors, borderColor: '#0f0', borderWidth: 1 }]
            },
            plugins: [pctLabelPlugin],
            options: {
                responsive: false,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { boxWidth: 8, color: '#0f0', font: { size: 8 } } },
                    title: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(ctx) {
                                return ctx.label + ': ' + ctx.parsed + '% of wealth';
                            }
                        }
                    }
                }
            }
        });
        
        // Top 1% Breakdown
        inst1 = new window.Chart(tCtx, {
            type: 'doughnut',
            data: {
                labels: ['Top 0.01%', 'Next 0.09%', 'Next 0.9%'],
                datasets: [{ data: d.top1, backgroundColor: top1Colors, borderColor: 'var(--alert-red)', borderWidth: 1 }]
            },
            plugins: [pctLabelPlugin],
            options: {
                responsive: false,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(ctx) {
                                return ctx.label + ': ' + ctx.parsed + '% of total wealth';
                            }
                        }
                    }
                }
            }
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
                plugins: { legend: { display: false }, title: { display: false } },
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

js = re.sub(r'let statsChartInstance = null;.*', new_js.strip(), js, flags=re.DOTALL)

with open('js/modules/mr-disco.js', 'w') as f:
    f.write(js)
