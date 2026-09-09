with open('js/modules/mr-disco.js', 'r') as f:
    content = f.read()

new_chart_fn = """
let statsChartInstance = null;
function renderStatsChart() {
    try {
        if (typeof Chart === 'undefined') { 
            document.getElementById('mr-disco-chart').outerHTML = '<p style="color:red; font-size:20px;">Chart library failed to load.</p>'; 
            return; 
        }
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
    } catch (err) {
        document.getElementById('mr-disco-chart').outerHTML = '<p style="color:red; font-size: 20px;">Error: ' + err.message + '</p>';
    }
}
"""

import re
content = re.sub(r'let statsChartInstance = null;.*', new_chart_fn.strip(), content, flags=re.DOTALL)

with open('js/modules/mr-disco.js', 'w') as f:
    f.write(content)

