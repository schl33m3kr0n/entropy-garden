import re
with open('js/modules/mr-disco.js', 'r') as f:
    js = f.read()

# Replace the wealthData block with verified, sourced data
old_data = """const wealthData = {
    us: {
        quintiles: [71, 15, 9, 4, 1],
        top1: [5, 9, 18],
        top1Labels: ['Top 0.01% (~$30M)', 'Top 0.1% (~$3.4M)', 'Top 1% (~$800K)'],
        incomes: ['$250K+', '~$100K', '~$68K', '~$42K', '~$15K']
    },
    global: {
        quintiles: [86, 11, 2, 1, 0],
        top1: [11, 15, 20],
        top1Labels: ['Top 0.01% (~$100M+)', 'Top 0.1% (~$10M)', 'Top 1% (~$1M)'],
        incomes: ['$50K+', '~$10K', '~$3K', '~$1K', '~$200']
    }
};"""

new_data = """const wealthData = {
    // Sources: Fed DFA Q4 2025, IRS SOI, Census CPS ASEC 2024
    us: {
        quintiles: [70, 14.5, 10, 3, 2.5],
        top1: [5, 9, 18],
        top1Labels: ['Top 0.01% (~\\$30M+)', 'Top 0.1% (~\\$3.3M)', 'Top 1% (~\\$800K)'],
        incomes: ['~\\$316K', '~\\$137K', '~\\$84K', '~\\$49K', '~\\$18K']
    },
    // Sources: UBS Global Wealth Report 2025, WID.world, Oxfam 2026
    global: {
        quintiles: [85, 11, 3, 1, 0],
        top1: [6, 14, 18],
        top1Labels: ['Top 0.01% (~\\$100M+)', 'Top 0.1% (~\\$10M)', 'Top 1% (~\\$1.2M)'],
        incomes: ['~\\$50K+', '~\\$10K', '~\\$3K', '~\\$1K', '<\\$500']
    }
};"""

js = js.replace(old_data, new_data)

with open('js/modules/mr-disco.js', 'w') as f:
    f.write(js)
