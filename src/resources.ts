/**
 * MCP Resources — reference docs Claude can read on demand.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const R365_GUIDE = `# R365 MCP Server — Quick Reference

You are connected to a Restaurant365 (R365) account via the OData API.
This is READ-ONLY access to restaurant operations data.

## How to use these tools

- User asks a question → you pick the right tool(s) → call them → interpret the results.
- Dates must be YYYY-MM-DD format. The tools convert to ISO for you.
- Sales endpoints (get_sales, get_sales_detail, get_sales_payments) have a 31-day max range.
- Use get_locations FIRST if you need to know what locations exist.
- Use get_gl_accounts to understand the chart of accounts before interpreting transactions.

## Tool chaining patterns

**"How are sales?"** → get_sales (totals) → get_sales_detail (item breakdown if needed)
**"P&L report"** → get_gl_accounts (understand accounts) → get_transactions (pull entries)
**"Labor costs"** → get_labor (hours/shifts) + get_sales (revenue) → calculate labor-to-sales %
**"Food cost"** → get_transactions (COGS entries) + get_sales (revenue) → calculate food cost %
**"Who works here?"** → get_employees + get_job_titles

## Key restaurant metrics to calculate

- **Food cost %** = COGS / Revenue (healthy: 28-35%)
- **Labor cost %** = Labor / Revenue (healthy: 25-32%)
- **Prime cost** = Food cost + Labor cost (healthy: under 65%)
- **Average ticket** = Revenue / Transaction count
- **Revenue per labor hour** = Revenue / Total labor hours

## What each tool returns

- **get_sales** → ticket headers: date, server, amounts, guest count, location
- **get_sales_detail** → line items: menu item name, quantity, amount
- **get_sales_payments** → payment methods: type, amount per ticket
- **get_transactions** → financial entries: date, type, amount, location, approval status
- **get_transaction_detail** → line items for one transaction: GL account, debit, credit
- **get_gl_accounts** → chart of accounts: name, number, type, category
- **get_locations** → locations: name, number, legal entity
- **get_labor** → punches: employee, date, shift start/end, hours, payroll status
- **get_employees** → staff: name, hire date, location, contact
- **get_job_titles** → roles: title, pay rate, GL mapping
- **get_items** → inventory: name, 3-level category
- **get_vendors** → companies: name, ID, audit fields
- **query_r365** → custom OData query against any view (advanced)
`;

export function registerResources(server: McpServer) {
  server.resource(
    "r365-guide",
    "r365://guide",
    { description: "Quick reference for R365 tools, data model, and restaurant metrics" },
    async () => ({
      contents: [
        {
          uri: "r365://guide",
          mimeType: "text/markdown",
          text: R365_GUIDE,
        },
      ],
    })
  );

  // Local business context — reads from .instructions.md if it exists
  server.resource(
    "business-context",
    "r365://business-context",
    { description: "Business-specific context (locations, goals, preferences) — from local .instructions.md" },
    async () => {
      const instructionsPath = join(__dirname, "..", ".instructions.md");
      let text: string;
      try {
        text = readFileSync(instructionsPath, "utf-8");
      } catch {
        text = "No .instructions.md file found. Copy .instructions.example to .instructions.md and fill in your business details.";
      }
      return {
        contents: [
          {
            uri: "r365://business-context",
            mimeType: "text/markdown",
            text,
          },
        ],
      };
    }
  );
}
