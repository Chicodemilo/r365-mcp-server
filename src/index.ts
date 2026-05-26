#!/usr/bin/env node

import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod/v3";
import { R365Client, type ODataView, type ODataQueryParams } from "./r365-client.js";
import { registerPrompts } from "./prompts.js";

// ---------------------------------------------------------------------------
// Configuration — read from environment variables
// ---------------------------------------------------------------------------
const domain = process.env.R365_DOMAIN;
const username = process.env.R365_USERNAME;
const password = process.env.R365_PASSWORD;

if (!domain || !username || !password) {
  console.error(
    "Missing required environment variables: R365_DOMAIN, R365_USERNAME, R365_PASSWORD\n" +
      "  R365_DOMAIN   = your company subdomain (the part before .restaurant365.com)\n" +
      "  R365_USERNAME = your R365 login username\n" +
      "  R365_PASSWORD = your R365 login password"
  );
  process.exit(1);
}

const client = new R365Client({ domain, username, password });

// ---------------------------------------------------------------------------
// Helper — format OData results for Claude
// ---------------------------------------------------------------------------
function formatResult(data: unknown): string {
  if (typeof data === "object" && data !== null && "value" in data) {
    const arr = (data as { value: unknown[] }).value;
    if (arr.length === 0) return "No results found.";
    return JSON.stringify(arr, null, 2);
  }
  return JSON.stringify(data, null, 2);
}

async function runQuery(
  view: ODataView,
  params: ODataQueryParams
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  try {
    const data = await client.query(view, params);
    return { content: [{ type: "text", text: formatResult(data) }] };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { content: [{ type: "text", text: `Error: ${msg}` }] };
  }
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------
function toISODate(dateStr: string): string {
  return new Date(dateStr).toISOString();
}

function defaultDateRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// MCP Server
// ---------------------------------------------------------------------------
const server = new McpServer({
  name: "r365-mcp-server",
  version: "1.0.0",
});

// ---- Tool: Get Sales Data ----
server.tool(
  "get_sales",
  "Get sales ticket data from R365 (headers with server, amounts, guest count). " +
    "Useful for revenue analysis, average ticket size, guest counts. " +
    "Note: max 31-day date range per request.",
  {
    start_date: z
      .string()
      .describe("Start date (YYYY-MM-DD). Defaults to 7 days ago."),
    end_date: z
      .string()
      .describe("End date (YYYY-MM-DD). Defaults to today."),
    location_filter: z
      .string()
      .optional()
      .describe("Optional location name to filter by (partial match)."),
    top: z
      .number()
      .optional()
      .describe("Max number of results to return (default 100)."),
  },
  async ({ start_date, end_date, location_filter, top }) => {
    const s = start_date ? toISODate(start_date) : defaultDateRange().start;
    const e = end_date ? toISODate(end_date) : defaultDateRange().end;
    let filter = `modifiedOn ge ${s} and modifiedOn lt ${e}`;
    if (location_filter) {
      filter += ` and contains(locationName,'${location_filter}')`;
    }
    return runQuery("SalesEmployee", { $filter: filter, $top: top ?? 100 });
  }
);

// ---- Tool: Get Sales Detail ----
server.tool(
  "get_sales_detail",
  "Get line-item sales detail (menu items, quantities, amounts). " +
    "Useful for product mix analysis, item-level revenue. " +
    "Note: max 31-day date range per request.",
  {
    start_date: z.string().describe("Start date (YYYY-MM-DD)."),
    end_date: z.string().describe("End date (YYYY-MM-DD)."),
    top: z
      .number()
      .optional()
      .describe("Max results (default 200)."),
  },
  async ({ start_date, end_date, top }) => {
    const s = toISODate(start_date);
    const e = toISODate(end_date);
    return runQuery("SalesDetail", {
      $filter: `modifiedOn ge ${s} and modifiedOn lt ${e}`,
      $top: top ?? 200,
    });
  }
);

// ---- Tool: Get Sales Payments ----
server.tool(
  "get_sales_payments",
  "Get payment method breakdown for sales tickets (cash, card, etc.). " +
    "Note: max 31-day date range per request.",
  {
    start_date: z.string().describe("Start date (YYYY-MM-DD)."),
    end_date: z.string().describe("End date (YYYY-MM-DD)."),
    top: z
      .number()
      .optional()
      .describe("Max results (default 100)."),
  },
  async ({ start_date, end_date, top }) => {
    const s = toISODate(start_date);
    const e = toISODate(end_date);
    return runQuery("SalesPayment", {
      $filter: `modifiedOn ge ${s} and modifiedOn lt ${e}`,
      $top: top ?? 100,
    });
  }
);

// ---- Tool: Get Transactions (P&L, Journal Entries, etc.) ----
server.tool(
  "get_transactions",
  "Get financial transactions from R365 (P&L entries, journal entries, invoices, etc.). " +
    "Useful for generating P&L reports, tracking expenses, and financial analysis.",
  {
    start_date: z.string().describe("Start date (YYYY-MM-DD)."),
    end_date: z.string().describe("End date (YYYY-MM-DD)."),
    location_filter: z
      .string()
      .optional()
      .describe("Optional location name filter."),
    top: z
      .number()
      .optional()
      .describe("Max results (default 200)."),
  },
  async ({ start_date, end_date, location_filter, top }) => {
    const s = toISODate(start_date);
    const e = toISODate(end_date);
    let filter = `date ge ${s} and date lt ${e}`;
    if (location_filter) {
      filter += ` and contains(locationName,'${location_filter}')`;
    }
    return runQuery("Transaction", { $filter: filter, $top: top ?? 200 });
  }
);

// ---- Tool: Get Transaction Detail ----
server.tool(
  "get_transaction_detail",
  "Get line-item details for a specific transaction (debits, credits, GL account, amounts). " +
    "Use after get_transactions to drill into a specific entry.",
  {
    transaction_id: z
      .string()
      .describe("The transaction ID (UUID) to get details for."),
  },
  async ({ transaction_id }) => {
    return runQuery("TransactionDetail", {
      $filter: `transactionId eq ${transaction_id}`,
    });
  }
);

// ---- Tool: Get GL Accounts (Chart of Accounts) ----
server.tool(
  "get_gl_accounts",
  "Get the chart of accounts (GL accounts) from R365. " +
    "Useful for understanding account categories, mapping expenses, and financial reporting.",
  {
    search: z
      .string()
      .optional()
      .describe("Optional search term to filter account names."),
    top: z
      .number()
      .optional()
      .describe("Max results (default 100)."),
  },
  async ({ search, top }) => {
    const params: ODataQueryParams = { $top: top ?? 100 };
    if (search) {
      params.$filter = `contains(name,'${search}')`;
    }
    return runQuery("GlAccount", params);
  }
);

// ---- Tool: Get Locations ----
server.tool(
  "get_locations",
  "Get all restaurant locations from R365. Returns location names, IDs, and legal entities.",
  {
    search: z
      .string()
      .optional()
      .describe("Optional search term to filter location names."),
  },
  async ({ search }) => {
    const params: ODataQueryParams = {};
    if (search) {
      params.$filter = `contains(name,'${search}')`;
    }
    return runQuery("Location", params);
  }
);

// ---- Tool: Get Labor Data ----
server.tool(
  "get_labor",
  "Get labor/punch clock data from R365 (shift times, hours worked, payroll status). " +
    "Useful for labor cost analysis, overtime tracking, and scheduling insights.",
  {
    date: z
      .string()
      .describe("Date to query (YYYY-MM-DD). Labor data is queried per day."),
    employee_id: z
      .string()
      .optional()
      .describe("Optional employee ID (UUID) to filter to a specific person."),
    top: z
      .number()
      .optional()
      .describe("Max results (default 200)."),
  },
  async ({ date, employee_id, top }) => {
    let filter = `dateWorked eq ${toISODate(date)}`;
    if (employee_id) {
      filter += ` and employee_Id eq ${employee_id}`;
    }
    return runQuery("LaborDetail", { $filter: filter, $top: top ?? 200 });
  }
);

// ---- Tool: Get Employees ----
server.tool(
  "get_employees",
  "Get employee records from R365 (names, hire dates, locations, contact info).",
  {
    search: z
      .string()
      .optional()
      .describe("Optional search term to filter employee names."),
    location_filter: z
      .string()
      .optional()
      .describe("Optional location name filter."),
    top: z
      .number()
      .optional()
      .describe("Max results (default 100)."),
  },
  async ({ search, location_filter, top }) => {
    const params: ODataQueryParams = { $top: top ?? 100 };
    const filters: string[] = [];
    if (search) filters.push(`contains(name,'${search}')`);
    if (location_filter) filters.push(`contains(locationName,'${location_filter}')`);
    if (filters.length > 0) params.$filter = filters.join(" and ");
    return runQuery("Employee", params);
  }
);

// ---- Tool: Get Job Titles ----
server.tool(
  "get_job_titles",
  "Get job title classifications from R365 (titles, pay rates, GL account mappings).",
  {
    search: z
      .string()
      .optional()
      .describe("Optional search term to filter job titles."),
  },
  async ({ search }) => {
    const params: ODataQueryParams = {};
    if (search) {
      params.$filter = `contains(name,'${search}')`;
    }
    return runQuery("JobTitle", params);
  }
);

// ---- Tool: Get Inventory Items ----
server.tool(
  "get_items",
  "Get inventory items from R365 (with 3-level categorization). " +
    "Useful for food cost analysis and inventory management.",
  {
    search: z
      .string()
      .optional()
      .describe("Optional search term to filter item names."),
    top: z
      .number()
      .optional()
      .describe("Max results (default 100)."),
  },
  async ({ search, top }) => {
    const params: ODataQueryParams = { $top: top ?? 100 };
    if (search) {
      params.$filter = `contains(name,'${search}')`;
    }
    return runQuery("Item", params);
  }
);

// ---- Tool: Get Vendors/Companies ----
server.tool(
  "get_vendors",
  "Get vendor/company records from R365. Useful for AP analysis and vendor management.",
  {
    search: z
      .string()
      .optional()
      .describe("Optional search term to filter vendor names."),
    top: z
      .number()
      .optional()
      .describe("Max results (default 100)."),
  },
  async ({ search, top }) => {
    const params: ODataQueryParams = { $top: top ?? 100 };
    if (search) {
      params.$filter = `contains(name,'${search}')`;
    }
    return runQuery("Company", params);
  }
);

// ---- Tool: Run Custom OData Query ----
server.tool(
  "query_r365",
  "Run a custom OData query against any R365 view. Use this for advanced queries " +
    "that the other tools don't cover. Available views: Transaction, TransactionDetail, " +
    "Company, Item, Location, GlAccount, Employee, JobTitle, LaborDetail, POSEmployee, " +
    "SalesEmployee, SalesDetail, SalesPayment, EntityDeleted.",
  {
    view: z
      .enum([
        "Transaction",
        "TransactionDetail",
        "Company",
        "Item",
        "Location",
        "GlAccount",
        "Employee",
        "JobTitle",
        "LaborDetail",
        "POSEmployee",
        "SalesEmployee",
        "SalesDetail",
        "SalesPayment",
        "EntityDeleted",
      ])
      .describe("The OData view to query."),
    filter: z
      .string()
      .optional()
      .describe("OData $filter expression (e.g. \"date ge 2024-01-01T00:00:00Z\")."),
    select: z
      .string()
      .optional()
      .describe("Comma-separated fields to return (e.g. \"name,amount,date\")."),
    orderby: z
      .string()
      .optional()
      .describe("Field to sort by, optionally with 'desc' (e.g. \"date desc\")."),
    top: z
      .number()
      .optional()
      .describe("Max results to return."),
    skip: z
      .number()
      .optional()
      .describe("Number of results to skip (for pagination)."),
  },
  async ({ view, filter, select, orderby, top, skip }) => {
    return runQuery(view, {
      $filter: filter,
      $select: select,
      $orderby: orderby,
      $top: top,
      $skip: skip,
    });
  }
);

// ---------------------------------------------------------------------------
// MCP Prompts (slash commands in Claude Desktop)
// ---------------------------------------------------------------------------
registerPrompts(server);

// ---------------------------------------------------------------------------
// Start the server
// ---------------------------------------------------------------------------
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("R365 MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
