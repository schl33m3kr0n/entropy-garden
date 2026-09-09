import re
with open('js/modules/mr-disco.js', 'r') as f:
    content = f.read()

new_fn = """
function renderStatsChart() {
    alert("RENDER CALLED! window.Chart type is: " + typeof window.Chart);
}
"""

content = re.sub(r'function renderStatsChart\(\) \{.*', new_fn.strip(), content, flags=re.DOTALL)

with open('js/modules/mr-disco.js', 'w') as f:
    f.write(content)
