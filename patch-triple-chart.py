import re
with open('js/modules/mr-disco.js', 'r') as f:
    content = f.read()

new_fn = """
let statsChartInstance = null;
let statsPieInstance = null;
let statsSubgraphInstance = null;
let currentPieType = 'pie';

function updatePieChart() {
    if (!statsPieInstance) return;
    statsPieInstance.config.type = currentPieType;
    statsPieInstance.update();
}

function renderStatsChart() {
    const pieCtx = document.getElementById('mr-disco-pie');
    const subCtx = document.getElementById('mr-disco-subgraph');
    const barCtx = document.getElementById('mr-disco-chart');
    if (!pieCtx || !barCtx || !subCtx) return;

    try {
        if (typeof window.Chart === 'undefined') { 
            pieCtx.parentElement.innerHTML = '<div style="color:red; font-size:16px;">CHART UNDEFINED</div>';
            return; 
        }
        
        if (statsChartInstance) statsChartInstance.destroy();
        if (statsPieInstance) statsPieInstance.destroy();
        if (statsSubgraphInstance) statsSubgraphInstance.destroy();
        
        window.Chart.defaults.color = '#0f0';
        if (window.Chart.defaults.font) window.Chart.defaults.font.family = 'monospace';
        
        // Main Quintile Pie Chart
        statsPieInstance = new window.Chart(pieCtx, {
            type: currentPieType,
            data: {
                labels: ['Top 20%', '2nd 20%', '3rd 20%', '4th 20%', 'Bottom 20%'],
                datasets: [{
                    data: [71, 15, 9, 4, 1],
                    backgroundColor: [
                        'rgba(0, 255, 0, 1.0)',
                        'rgba(0, 255, 0, 0.7)',
                        'rgba(0, 255, 0, 0.4)',
                        'rgba(0, 255, 0, 0.2)',
                        'rgba(0, 255, 0, 0.05)'
                    ],
                    borderColor: '#0f0',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { boxWidth: 10, color: '#0f0', font: { size: 9 } } },
                    title: { display: false }
                }
            }
        });
        
        // Subgraph for Top 1% vs Next 19%
        statsSubgraphInstance = new window.Chart(subCtx, {
            type: 'doughnut',
            data: {
                labels: ['Top 1%', 'Next 19%'],
                datasets: [{
                    data: [32, 39],
                    backgroundColor: [
                        'rgba(255, 0, 85, 0.9)',
                        'rgba(0, 255, 0, 0.6)'
                    ],
                    borderColor: ['var(--alert-red)', '#0f0'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 8, color: '#0f0', font: { size: 9 } } },
                    title: { display: false }
                }
            }
        });
        
        // Top 10 GDP Bar Chart
        statsChartInstance = new window.Chart(barCtx, {
            type: 'bar',
            data: {
                labels: ['USA', 'CHN', 'DEU', 'JPN', 'IND', 'GBR', 'FRA', 'ITA', 'BRA', 'CAN'],
                datasets: [{
                    label: 'GDP ($T)',
                    data: [27.3, 17.7, 4.4, 4.2, 3.7, 3.3, 3.0, 2.1, 2.1, 2.1],
                    backgroundColor: 'rgba(255, 255, 255, 0.7)',
                    borderColor: '#fff',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'GLOBAL GDP TOP 10 ($T)', color: '#fff', font: { size: 10 } }
                },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#fff', font: { size: 9 } } },
                    x: { grid: { display: false }, ticks: { color: '#fff', font: { size: 9 } } }
                }
            }
        });
        
        document.querySelectorAll('.chart-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                document.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentPieType = btn.dataset.type;
                updatePieChart();
            });
        });
        
    } catch (err) {
        pieCtx.parentElement.innerHTML = '<div style="color:red; font-size:16px;">ERR: ' + err.message + '</div>';
    }
}
"""

# The existing codebase has `let statsChartInstance` at the top of the replacement block
content = re.sub(r'let statsChartInstance = null;.*', new_fn.strip(), content, flags=re.DOTALL)

with open('js/modules/mr-disco.js', 'w') as f:
    f.write(content)
