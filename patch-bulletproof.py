import re
with open('js/modules/mr-disco.js', 'r') as f:
    content = f.read()

new_fn = """
function renderStatsChart() {
    const pieCtx = document.getElementById('mr-disco-pie');
    const barCtx = document.getElementById('mr-disco-chart');
    if (!pieCtx || !barCtx) return;
    
    // Diagnostic visualizer
    pieCtx.style.border = '2px solid cyan';
    barCtx.style.border = '2px solid magenta';

    try {
        if (typeof window.Chart === 'undefined') { 
            pieCtx.parentElement.innerHTML = '<div style="color:red; font-size:16px; background:black; padding:10px; z-index:999;">CHART UNDEFINED</div>';
            return; 
        }
        
        if (statsChartInstance) statsChartInstance.destroy();
        if (statsPieInstance) statsPieInstance.destroy();
        
        window.Chart.defaults.color = '#0f0';
        if (window.Chart.defaults.font) window.Chart.defaults.font.family = 'monospace';
        
        statsPieInstance = new window.Chart(pieCtx, {
            type: currentPieType,
            data: {
                labels: ['Top 1%', 'Next 9%', 'Bottom 90%'],
                datasets: [{
                    data: [43, 40, 17],
                    backgroundColor: [
                        'rgba(0, 255, 0, 0.9)',
                        'rgba(0, 255, 0, 0.5)',
                        'rgba(0, 255, 0, 0.15)'
                    ],
                    borderColor: '#0f0',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: false,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { boxWidth: 12, color: '#0f0', font: { size: 10 } } },
                    title: { display: false }
                }
            }
        });
        
        statsChartInstance = new window.Chart(barCtx, {
            type: 'bar',
            data: {
                labels: ['USA', 'CHN', 'DEU'],
                datasets: [{
                    label: 'GDP ($T)',
                    data: [27.3, 17.7, 4.4],
                    backgroundColor: [
                        'rgba(255, 255, 255, 0.8)',
                        'rgba(255, 255, 255, 0.5)',
                        'rgba(255, 255, 255, 0.2)'
                    ],
                    borderColor: '#fff',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: false,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'GDP ($T)', color: '#fff' }
                },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#fff' } },
                    x: { grid: { display: false }, ticks: { color: '#fff' } }
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
        pieCtx.parentElement.innerHTML = '<div style="color:red; font-size:16px; background:black; padding:10px; z-index:999; word-break:break-all;">ERR: ' + err.message + '</div>';
    }
}
"""

content = re.sub(r'function renderStatsChart\(\) \{.*', new_fn.strip(), content, flags=re.DOTALL)

with open('js/modules/mr-disco.js', 'w') as f:
    f.write(content)
