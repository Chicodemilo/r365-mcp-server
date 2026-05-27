# Hey! Here's your R365 + Claude setup

You've got a custom integration that connects Claude Desktop to your Restaurant365 account. Here's what you need to know.

## What you can do

Just talk to Claude like normal. It can now pull live data from your R365 account. Try things like:

- "What were sales last week?"
- "Show me labor costs for Monday at Mueller"
- "Pull my P&L for May"
- "What's my food cost percentage this month?"
- "List all employees at Arboretum"

You can also type `/` to see shortcut commands like `/daily-snapshot`, `/weekly-sales`, `/labor-report`, etc. These run pre-built reports.

## Claude remembers things now

When you tell Claude something about your business, it saves it for next time. For example:

- "Mueller is our newest location, still ramping up"
- "I want food cost under 30%"
- "I check sales every Monday morning"

Claude will remember that in future conversations. You don't need to repeat yourself. If you want to see what it's saved, ask "What do you know about my business?" If you want it to forget everything, say "Clear your notes."

## How to update (when Miles pushes changes)

When there's an update to the tools, open Terminal and run:

```
cd ~/r365-mcp-server
git pull
npm run build
```

Then quit Claude Desktop (Cmd+Q) and reopen it. That's it.

If you get an error about "npm not found" or "git not found", text Miles. **Do not try to debug this yourself** — it's a developer tooling issue, not a you issue.

## If something breaks

**Don't try to fix it.** Just text Miles with:

1. What you asked Claude
2. What happened (error message, weird response, nothing, etc.)

That's all he needs to figure it out.

## Quick reference

| Slash command | What it does |
|--------------|-------------|
| `/daily-snapshot` | Sales + labor + red flags for one day |
| `/weekly-sales` | Weekly revenue with top items and trends |
| `/labor-report` | Hours, labor cost, labor-to-sales ratio |
| `/pl-summary` | Full P&L breakdown |
| `/product-mix` | Top and bottom selling menu items |
| `/food-cost` | Vendor spend and food cost % |
| `/payment-breakdown` | Cash vs card vs other payment methods |
| `/team-roster` | Employees by location and role |

You can add instructions to any of these. For example, after picking `/weekly-sales` you could add: "Just show me Mueller and Seaholm, and compare them."
