# R365 MCP Server
Built for a friend who owns a restaurant group. They wanted to ask Claude questions about their business instead of digging through R365 dashboards.

This connects Claude to a Restaurant365 account. Ask Claude about  sales, labor, P&L, inventory, and more — just like you'd use Notion or Google Drive integrations.

## Quick Start (Mac)

You need [Node.js](https://nodejs.org/) installed. If you're not sure, open Terminal and run `node -v`. If you see a version number, you're good. If not, download it from https://nodejs.org/ first.

### 1. Clone and build

Open Terminal and paste these lines one at a time:

```bash
git clone https://github.com/Chicodemilo/r365-mcp-server.git
cd r365-mcp-server
npm install
npm run build
```

### 2. Add your R365 credentials

Still in Terminal:

```bash
cp .env.example .env
open .env
```

This opens the `.env` file in TextEdit. Fill in your values:

```
R365_DOMAIN=honestmarys
R365_USERNAME=your-r365-email@honestmarys.com
R365_PASSWORD=your-r365-password
```

- **R365_DOMAIN** is the part before `.restaurant365.com` in your login URL
- **R365_USERNAME** and **R365_PASSWORD** are the same credentials you use to log into R365
- Your R365 user must have the **"Accounting Clerk"** or **"Full Access"** role

Save and close the file.

### 3. Tell Claude Desktop where to find it

Still in Terminal, paste this to find out where the server lives:

```bash
echo "Your server path is: $(pwd)/dist/index.js"
```

Copy that path. Then open the Claude Desktop config:

```bash
open ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

Add this block at the top of the file, right after the opening `{`:

```json
"mcpServers": {
  "r365": {
    "command": "node",
    "args": ["PASTE_YOUR_PATH_HERE"]
  }
},
```

Replace `PASTE_YOUR_PATH_HERE` with the path you copied. It should look something like:

```json
"mcpServers": {
  "r365": {
    "command": "node",
    "args": ["/Users/yourname/r365-mcp-server/dist/index.js"]
  }
},
```

Save and close the file.

### 4. Restart Claude Desktop

Quit Claude Desktop completely (Cmd+Q) and reopen it. Look for the hammer icon at the bottom of the chat — that means the R365 tools loaded.

### 5. Try it out

Type any of these in Claude:

- "Show me all my locations"
- "What were sales last week?"
- "Pull my P&L for May"

Or use a slash command — type `/` to see the list.

---

## What You Can Ask Claude

Once connected, you can ask things like:

- "Show me last week's sales across all locations"
- "What were my labor costs on Monday?"
- "Pull the transactions for May"
- "Who are my top vendors by spend?"
- "List all employees at [location]"
- "What's my chart of accounts look like?"
- "Show me the product mix for last weekend"

## Slash Commands

Type `/` in Claude Desktop to see these. Each one pulls the right data from R365 and gives you a formatted report. You can add extra instructions to any of them (e.g., "focus on the Mueller location" or "compare to last month").

| Command | What it does | R365 Data Used |
|---------|-------------|----------------|
| `/daily-snapshot` | Morning check-in: sales, labor, and red flags for a single day | Sales + Labor + Transactions |
| `/weekly-sales` | Weekly revenue report with top items and day-over-day trends | Sales + Menu Items |
| `/labor-report` | Labor cost analysis: hours, labor-to-sales ratio, overtime flags | Labor + Employees + Sales |
| `/pl-summary` | Profit & Loss: revenue, COGS, labor, expenses, net income | Transactions + GL Accounts |
| `/product-mix` | Menu performance: top/bottom sellers, category breakdown | Menu Items + Inventory |
| `/food-cost` | Food cost analysis: vendor spend, COGS %, cost anomalies | Transactions + Vendors + Sales |
| `/payment-breakdown` | How guests are paying: cash vs card vs delivery | Payments + Sales |
| `/team-roster` | Team overview: headcount by location, roles, tenure | Employees + Job Titles + Locations |

## All Available Tools

These are the raw tools Claude can call. You don't need to know these — Claude picks the right one based on your question. But here they are for reference:

| Tool | What it does |
|------|-------------|
| `get_sales` | Sales ticket data (revenue, guest counts, averages) |
| `get_sales_detail` | Line-item sales (menu items, quantities) |
| `get_sales_payments` | Payment method breakdown (cash, card, etc.) |
| `get_transactions` | Financial transactions (P&L entries, invoices, journal entries) |
| `get_transaction_detail` | Drill into a specific transaction's line items |
| `get_gl_accounts` | Chart of accounts |
| `get_locations` | All restaurant locations |
| `get_labor` | Punch clock / labor data (hours, shifts, payroll status) |
| `get_employees` | Employee records |
| `get_job_titles` | Job classifications and pay rates |
| `get_items` | Inventory items |
| `get_vendors` | Vendor/company records |
| `query_r365` | Custom OData query (advanced — any view, any filter) |

## Limitations

- **Sales data** (sales, sales detail, sales payments) is limited to **31-day date ranges** per request — this is an R365 API limitation.
- The OData API is **read-only** — you can pull data but not create or modify records.
- Your R365 user must have the "Accounting Clerk" or "Full Access" role.

## Troubleshooting

**Hammer icon not showing in Claude Desktop?**
- Make sure you quit Claude completely (Cmd+Q) and reopened it
- Check that the path in `claude_desktop_config.json` points to the actual `dist/index.js` file

**"Missing required environment variables"**
- Make sure you created the `.env` file: `cp .env.example .env`
- Make sure it has all three values filled in (R365_DOMAIN, R365_USERNAME, R365_PASSWORD)

**401 Unauthorized**
- Double-check your credentials
- The domain should be just the subdomain (e.g., `honestmarys`, not `honestmarys.restaurant365.com`)

**No data returned**
- Check that your date ranges are correct
- Make sure your R365 user has the right permissions (Accounting Clerk or Full Access)
