import re

with open('js/modules/mr-disco.js', 'r') as f:
    content = f.read()

chart_fn = """
let statsChartInstance = null;
function renderStatsChart() {
    if (typeof Chart === 'undefined') return;
    const ctx = document.getElementById('mr-disco-chart');
    if (!ctx) return;
    
    if (statsChartInstance) {
        statsChartInstance.destroy();
    }
    
    statsChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Wealth: Top 1%', 'Wealth: Next 9%', 'Wealth: Bottom 90%', 'GDP: USA ($T)', 'GDP: CHN ($T)', 'GDP: DEU ($T)'],
            datasets: [{
                label: 'Global Metrics',
                data: [43, 40, 17, 27.3, 17.7, 4.4],
                backgroundColor: [
                    'rgba(0, 255, 0, 0.8)',
                    'rgba(0, 255, 0, 0.6)',
                    'rgba(0, 255, 0, 0.3)',
                    'rgba(255, 255, 255, 0.8)',
                    'rgba(255, 255, 255, 0.6)',
                    'rgba(255, 255, 255, 0.3)'
                ],
                borderColor: '#0f0',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            color: '#fff',
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0, 255, 0, 0.1)' },
                    ticks: { color: '#0f0', font: { family: 'monospace' } }
                },
                x: {
                    grid: { color: 'rgba(0, 255, 0, 0.1)' },
                    ticks: { color: '#0f0', font: { family: 'monospace', size: 10 } }
                }
            }
        }
    });
}
"""

replacement = """        if (event.key === '0') {
            event.preventDefault();
            event.stopPropagation();
            const stats = document.getElementById('mr-disco-stats-shell');
            if (stats) {
                stats.hidden = !stats.hidden;
                activateEyeMode(stats.hidden ? 'track' : 'sleepy');
                if (!stats.hidden) renderStatsChart();
            } else {
                activateEyeMode('sleepy');
            }
            return;
        }"""

content = content.replace("        if (event.key === '0') {\n            event.preventDefault();\n            event.stopPropagation();\n            const stats = document.getElementById('mr-disco-stats-shell');\n            if (stats) {\n                stats.hidden = !stats.hidden;\n                activateEyeMode(stats.hidden ? 'track' : 'sleepy');\n            } else {\n                activateEyeMode('sleepy');\n            }\n            return;\n        }", replacement)

content = content + "\n" + chart_fn

with open('js/modules/mr-disco.js', 'w') as f:
    f.write(content)

