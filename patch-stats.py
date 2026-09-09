import re

with open('index.html', 'r') as f:
    content = f.read()

new_stats = """                        <div class="mr-disco-stats-shell" id="mr-disco-stats-shell" hidden>
                            <div class="stats-text-grid">
                                <div>
                                    <p class="alt-history-meta">GLOBAL POPULATION</p>
                                    <p class="alt-history-excerpt"><span id="pop-counter-disco" style="color: #fff;">8,100,245,678</span></p>
                                </div>
                                <div>
                                    <p class="alt-history-meta">WEALTH DISTRIBUTION</p>
                                    <p class="alt-history-excerpt">Top 1% (43%) &middot; Next 9% (40%) &middot; Bottom 90% (17%)</p>
                                </div>
                                <div>
                                    <p class="alt-history-meta">TOP GDPs (Trillions)</p>
                                    <p class="alt-history-excerpt">USA ($27.3T) &middot; CHN ($17.7T) &middot; DEU ($4.4T)</p>
                                </div>
                            </div>
                            <div class="stats-chart-container" style="margin-top: 1.5rem; position: relative; height: 160px; width: 100%;">
                                <canvas id="mr-disco-chart"></canvas>
                            </div>
                        </div>"""

old_stats_regex = re.compile(r'<div class="mr-disco-stats-shell" id="mr-disco-stats-shell" hidden>.*?</div>\s*</div>\s*</div>\s*<article', re.DOTALL)

# Let's do a more precise replacement
old_stats = """                        <div class="mr-disco-stats-shell" id="mr-disco-stats-shell" hidden>
                            <div>
                                <p class="alt-history-meta">GLOBAL POPULATION</p>
                                <p class="alt-history-excerpt"><span id="pop-counter-disco" style="color: #fff;">8,100,245,678</span></p>
                            </div>
                            <div>
                                <p class="alt-history-meta">WEALTH DISTRIBUTION</p>
                                <p class="alt-history-excerpt">Top 1% (43%) · Next 9% (40%) · Bottom 90% (17%)</p>
                            </div>
                            <div>
                                <p class="alt-history-meta">TOP GDPs (Trillions)</p>
                                <p class="alt-history-excerpt">USA ($27.3T) · CHN ($17.7T) · DEU ($4.4T)</p>
                            </div>
                        </div>"""

content = content.replace(old_stats, new_stats)

with open('index.html', 'w') as f:
    f.write(content)

