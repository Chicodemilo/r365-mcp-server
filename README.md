# R365 MCP Server

Connect Claude to your Restaurant365 account. Ask Claude about your sales, labor, P&L, inventory, and more — just like you'd use Notion or Google Drive integrations.

## What You Can Ask Claude

Once connected, you can ask things like:

- "Show me last week's sales across all locations"
- "What were my labor costs on Monday?"
- "Pull the transactions for May"
- "Who are my top vendors by spend?"
- "List all employees at [location]"
- "What's my chart of accounts look like?"
- "Show me the product mix for last weekend"

## Setup

### 1. Get Your R365 Credentials

You need three things from your R365 account:

| Value | What it is | Example |
|-------|-----------|---------|
| **R365_DOMAIN** | Your company subdomain (the part before `.restaurant365.com` in your login URL) | `honestmarys` |
| **R365_USERNAME** | Your R365 login username | `john@honestmarys.com` |
| **R365_PASSWORD** | Your R365 login password | `••••••••` |

**Important:** Your R365 user account must have the **"Accounting Clerk"** or **"Full Access"** role to use the OData API.

### 2. Install & Build

```bash
git clone <this-repo>
cd r365_to_docs
npm install
npm run build
```

### 3. Set Up Your Credentials

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Then edit `.env` with your R365 credentials:

```env
R365_DOMAIN=honestmarys
R365_USERNAME=john@honestmarys.com
R365_PASSWORD=your-password-here
```

### 4. Connect to Claude Desktop

Open your Claude Desktop config file:

- **Mac:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

Add the R365 server to the `mcpServers` section:

```json
{
  "mcpServers": {
    "r365": {
      "command": "node",
      "args": ["/FULL/PATH/TO/r365_to_docs/dist/index.js"]
    }
  }
}
```

Replace `/FULL/PATH/TO/r365_to_docs` with the actual path where you cloned this repo. The server reads credentials from the `.env` file automatically — no need to put passwords in the Claude config.

### 5. Restart Claude Desktop

Close and reopen Claude Desktop. You should see the R365 tools available in the tools menu (hammer icon).

## Available Tools

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
- Your R365 user must have appropriate permissions (Accounting Clerk or Full Access role).

## Troubleshooting

**"Missing required environment variables"** — Make sure R365_DOMAIN, R365_USERNAME, and R365_PASSWORD are set in your `.env` file. Run `cp .env.example .env` if you haven't already.

**401 Unauthorized** — Double-check your credentials. The domain should be just the subdomain (e.g., `honestmarys`, not `honestmarys.restaurant365.com`).

**No data returned** — Check that your date ranges are correct and that your R365 user has the right permissions.
