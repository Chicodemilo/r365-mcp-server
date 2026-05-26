/**
 * MCP Prompts for R365.
 *
 * Each prompt maps to a slash command in Claude Desktop. It tells Claude:
 *   1. Which R365 tool(s) to call
 *   2. What parameters to use
 *   3. How to interpret and present the results
 *
 * Every prompt accepts an optional user instruction so the operator can
 * customize the output (e.g. "just show me the downtown location" or
 * "compare this week to last week").
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v3";

export function registerPrompts(server: McpServer) {
  // ------------------------------------------------------------------
  // /daily-snapshot
  // Endpoints: get_sales, get_labor, get_transactions
  // ------------------------------------------------------------------
  server.prompt(
    "daily-snapshot",
    "Quick daily overview: sales revenue, labor hours/cost, and any transaction " +
      "red flags for a single day. Great for morning check-ins.",
    {
      date: z
        .string()
        .optional()
        .describe("Date to review (YYYY-MM-DD). Defaults to yesterday."),
      location: z
        .string()
        .optional()
        .describe("Filter to a specific location name."),
      extra_instructions: z
        .string()
        .optional()
        .describe("Any additional instructions for how to analyze or present the data."),
    },
    ({ date, location, extra_instructions }) => {
      const targetDate = date || "yesterday";
      const locationClause = location
        ? ` Filter all data to the "${location}" location.`
        : " Show all locations, broken down individually.";

      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text:
                `Generate a daily snapshot for ${targetDate}.${locationClause}\n\n` +
                `**Step 1 — Sales:** Use the \`get_sales\` tool to pull sales data for that date. ` +
                `Report total revenue, transaction count, and average ticket size.\n\n` +
                `**Step 2 — Labor:** Use the \`get_labor\` tool for the same date. ` +
                `Report total hours worked, number of employees on shift, and estimated labor cost if pay rates are available.\n\n` +
                `**Step 3 — Transactions:** Use the \`get_transactions\` tool for the same date. ` +
                `Flag anything unusual — large transactions, voids, or entries that look out of pattern.\n\n` +
                `**Present the results as a clean summary with sections for Sales, Labor, and Flags.** ` +
                `Use tables where it helps. Keep it concise — this is a daily check-in, not a deep dive.\n\n` +
                (extra_instructions
                  ? `**Additional instructions from the user:** ${extra_instructions}\n`
                  : ""),
            },
          },
        ],
      };
    }
  );

  // ------------------------------------------------------------------
  // /weekly-sales
  // Endpoints: get_sales, get_sales_detail
  // ------------------------------------------------------------------
  server.prompt(
    "weekly-sales",
    "Weekly sales summary: total revenue, guest counts, average ticket, " +
      "top-selling items, and day-over-day trends. Broken down by location.",
    {
      week_of: z
        .string()
        .optional()
        .describe("Start date of the week (YYYY-MM-DD). Defaults to last 7 days."),
      location: z
        .string()
        .optional()
        .describe("Filter to a specific location name."),
      extra_instructions: z
        .string()
        .optional()
        .describe("Any additional instructions for how to analyze or present the data."),
    },
    ({ week_of, location, extra_instructions }) => {
      const dateNote = week_of
        ? `for the week starting ${week_of}`
        : "for the last 7 days";
      const locationClause = location
        ? ` Focus on the "${location}" location.`
        : " Break down by location.";

      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text:
                `Generate a weekly sales report ${dateNote}.${locationClause}\n\n` +
                `**Step 1 — Sales overview:** Use the \`get_sales\` tool to pull sales tickets for the date range. ` +
                `Calculate total revenue, total guest count, average ticket size, and daily totals.\n\n` +
                `**Step 2 — Product mix:** Use the \`get_sales_detail\` tool for the same date range. ` +
                `Identify the top 10 selling items by quantity and by revenue. Note any items with unusual volume.\n\n` +
                `**Step 3 — Trends:** Compare day-over-day performance. Highlight the strongest and weakest days. ` +
                `If location data is available, compare locations against each other.\n\n` +
                `**Present as a structured report with:** an executive summary (2-3 sentences), ` +
                `a revenue table by day, a top items table, and any notable callouts.\n\n` +
                (extra_instructions
                  ? `**Additional instructions from the user:** ${extra_instructions}\n`
                  : ""),
            },
          },
        ],
      };
    }
  );

  // ------------------------------------------------------------------
  // /labor-report
  // Endpoints: get_labor, get_employees, get_sales
  // ------------------------------------------------------------------
  server.prompt(
    "labor-report",
    "Labor cost analysis: hours worked, labor cost, labor-to-sales ratio, " +
      "overtime flags, and staffing patterns. Can run for a day or date range.",
    {
      start_date: z
        .string()
        .optional()
        .describe("Start date (YYYY-MM-DD). Defaults to yesterday."),
      end_date: z
        .string()
        .optional()
        .describe("End date (YYYY-MM-DD). Defaults to same as start_date for a single day."),
      location: z
        .string()
        .optional()
        .describe("Filter to a specific location name."),
      extra_instructions: z
        .string()
        .optional()
        .describe("Any additional instructions for how to analyze or present the data."),
    },
    ({ start_date, end_date, location, extra_instructions }) => {
      const dateNote = start_date
        ? end_date
          ? `from ${start_date} to ${end_date}`
          : `for ${start_date}`
        : "for yesterday";
      const locationClause = location
        ? ` Focus on the "${location}" location.`
        : " Break down by location.";

      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text:
                `Generate a labor report ${dateNote}.${locationClause}\n\n` +
                `**Step 1 — Labor data:** Use the \`get_labor\` tool to pull punch clock data for each day in the range. ` +
                `Calculate total hours, total shifts, and average shift length.\n\n` +
                `**Step 2 — Employee context:** Use the \`get_employees\` tool to get employee names and roles. ` +
                `Cross-reference with labor data to show hours by role/position.\n\n` +
                `**Step 3 — Sales context:** Use the \`get_sales\` tool for the same period to calculate ` +
                `the labor-to-sales ratio (labor cost / revenue). This is a key restaurant metric — ` +
                `flag if it's above 30%.\n\n` +
                `**Step 4 — Flags:** Identify any employees approaching or exceeding 40 hours/week (overtime risk). ` +
                `Note any unusually short or long shifts.\n\n` +
                `**Present as:** a summary with total hours and estimated labor cost, ` +
                `a table by employee or role, the labor-to-sales ratio, and any flags.\n\n` +
                (extra_instructions
                  ? `**Additional instructions from the user:** ${extra_instructions}\n`
                  : ""),
            },
          },
        ],
      };
    }
  );

  // ------------------------------------------------------------------
  // /pl-summary
  // Endpoints: get_transactions, get_transaction_detail, get_gl_accounts
  // ------------------------------------------------------------------
  server.prompt(
    "pl-summary",
    "Profit & Loss summary: revenue, COGS, labor, operating expenses, and net " +
      "income pulled from R365 transactions and GL accounts.",
    {
      start_date: z
        .string()
        .optional()
        .describe("Start date (YYYY-MM-DD). Defaults to first of current month."),
      end_date: z
        .string()
        .optional()
        .describe("End date (YYYY-MM-DD). Defaults to today."),
      location: z
        .string()
        .optional()
        .describe("Filter to a specific location name."),
      extra_instructions: z
        .string()
        .optional()
        .describe("Any additional instructions for how to analyze or present the data."),
    },
    ({ start_date, end_date, location, extra_instructions }) => {
      const dateNote = start_date
        ? `from ${start_date} to ${end_date || "today"}`
        : "for the current month to date";
      const locationClause = location
        ? ` Focus on the "${location}" location.`
        : " Show all locations, with a consolidated view and per-location breakdown.";

      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text:
                `Generate a P&L summary ${dateNote}.${locationClause}\n\n` +
                `**Step 1 — Chart of accounts:** Use the \`get_gl_accounts\` tool to understand the account structure ` +
                `(revenue accounts, COGS, labor, operating expenses, etc.).\n\n` +
                `**Step 2 — Transactions:** Use the \`get_transactions\` tool to pull all transactions for the period. ` +
                `Group and sum them by GL account category.\n\n` +
                `**Step 3 — Detail (if needed):** For any large or unusual transactions, use \`get_transaction_detail\` ` +
                `to drill in and explain what they are.\n\n` +
                `**Present as a P&L statement with these sections:**\n` +
                `- **Revenue** (total sales)\n` +
                `- **Cost of Goods Sold** (food, beverage, supplies)\n` +
                `- **Gross Profit** (revenue - COGS)\n` +
                `- **Labor** (wages, benefits, payroll taxes)\n` +
                `- **Operating Expenses** (rent, utilities, marketing, repairs, etc.)\n` +
                `- **Net Income** (gross profit - labor - operating expenses)\n\n` +
                `Include key percentages (COGS %, labor %, net margin %). ` +
                `Flag any line items that seem unusually high or low.\n\n` +
                (extra_instructions
                  ? `**Additional instructions from the user:** ${extra_instructions}\n`
                  : ""),
            },
          },
        ],
      };
    }
  );

  // ------------------------------------------------------------------
  // /product-mix
  // Endpoints: get_sales_detail, get_items
  // ------------------------------------------------------------------
  server.prompt(
    "product-mix",
    "Product mix analysis: top and bottom sellers by quantity and revenue, " +
      "category breakdown, and menu performance insights.",
    {
      start_date: z
        .string()
        .optional()
        .describe("Start date (YYYY-MM-DD). Defaults to last 7 days."),
      end_date: z
        .string()
        .optional()
        .describe("End date (YYYY-MM-DD). Defaults to today."),
      location: z
        .string()
        .optional()
        .describe("Filter to a specific location name."),
      extra_instructions: z
        .string()
        .optional()
        .describe("Any additional instructions for how to analyze or present the data."),
    },
    ({ start_date, end_date, location, extra_instructions }) => {
      const dateNote = start_date
        ? `from ${start_date} to ${end_date || "today"}`
        : "for the last 7 days";
      const locationClause = location
        ? ` Focus on the "${location}" location.`
        : "";

      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text:
                `Generate a product mix analysis ${dateNote}.${locationClause}\n\n` +
                `**Step 1 — Sales detail:** Use the \`get_sales_detail\` tool to pull line-item sales data. ` +
                `This gives you every menu item sold with quantities and amounts.\n\n` +
                `**Step 2 — Item context:** Use the \`get_items\` tool to get item categories ` +
                `(R365 has 3-level categorization). Map sales to categories.\n\n` +
                `**Present the analysis with:**\n` +
                `- **Top 15 items** by revenue (with quantity sold and avg price)\n` +
                `- **Top 15 items** by quantity (with total revenue)\n` +
                `- **Bottom 5 items** (low sellers that may be candidates for removal)\n` +
                `- **Category breakdown** (% of revenue by category)\n` +
                `- **Insights** — any items that are high volume but low revenue (underpriced?) ` +
                `or low volume but high revenue (premium items worth promoting?)\n\n` +
                (extra_instructions
                  ? `**Additional instructions from the user:** ${extra_instructions}\n`
                  : ""),
            },
          },
        ],
      };
    }
  );

  // ------------------------------------------------------------------
  // /food-cost
  // Endpoints: get_transactions, get_items, get_vendors, get_sales
  // ------------------------------------------------------------------
  server.prompt(
    "food-cost",
    "Food cost analysis: vendor spend, COGS as a percentage of revenue, " +
      "top vendors by spend, and cost anomalies.",
    {
      start_date: z
        .string()
        .optional()
        .describe("Start date (YYYY-MM-DD). Defaults to current month."),
      end_date: z
        .string()
        .optional()
        .describe("End date (YYYY-MM-DD). Defaults to today."),
      location: z
        .string()
        .optional()
        .describe("Filter to a specific location name."),
      extra_instructions: z
        .string()
        .optional()
        .describe("Any additional instructions for how to analyze or present the data."),
    },
    ({ start_date, end_date, location, extra_instructions }) => {
      const dateNote = start_date
        ? `from ${start_date} to ${end_date || "today"}`
        : "for the current month to date";
      const locationClause = location
        ? ` Focus on the "${location}" location.`
        : "";

      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text:
                `Generate a food cost analysis ${dateNote}.${locationClause}\n\n` +
                `**Step 1 — Vendor spend:** Use the \`get_vendors\` tool to get the vendor list, then use ` +
                `\`get_transactions\` tool to pull COGS-related transactions for the period. ` +
                `Group spend by vendor.\n\n` +
                `**Step 2 — Revenue context:** Use the \`get_sales\` tool to get total revenue for the same period. ` +
                `Calculate food cost percentage (total COGS / total revenue). ` +
                `Industry benchmark: food cost should typically be 28-35% for a restaurant.\n\n` +
                `**Step 3 — Item costs:** Use the \`get_items\` tool to see inventory items and their categories.\n\n` +
                `**Present the analysis with:**\n` +
                `- **Food cost percentage** (COGS / revenue) with a note on whether it's in a healthy range\n` +
                `- **Top 10 vendors by spend** (with amounts and % of total COGS)\n` +
                `- **Cost breakdown by category** (food, beverage, paper/supplies, etc.)\n` +
                `- **Anomalies** — any vendors with unusually high invoices, or spend that looks out of line ` +
                `compared to the volume of sales\n\n` +
                (extra_instructions
                  ? `**Additional instructions from the user:** ${extra_instructions}\n`
                  : ""),
            },
          },
        ],
      };
    }
  );

  // ------------------------------------------------------------------
  // /payment-breakdown
  // Endpoints: get_sales_payments, get_sales
  // ------------------------------------------------------------------
  server.prompt(
    "payment-breakdown",
    "Payment method analysis: how guests are paying (cash, credit, debit, " +
      "gift cards, etc.) with trends and percentages.",
    {
      start_date: z
        .string()
        .optional()
        .describe("Start date (YYYY-MM-DD). Defaults to last 7 days."),
      end_date: z
        .string()
        .optional()
        .describe("End date (YYYY-MM-DD). Defaults to today."),
      location: z
        .string()
        .optional()
        .describe("Filter to a specific location name."),
      extra_instructions: z
        .string()
        .optional()
        .describe("Any additional instructions for how to analyze or present the data."),
    },
    ({ start_date, end_date, location, extra_instructions }) => {
      const dateNote = start_date
        ? `from ${start_date} to ${end_date || "today"}`
        : "for the last 7 days";
      const locationClause = location
        ? ` Focus on the "${location}" location.`
        : "";

      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text:
                `Generate a payment method breakdown ${dateNote}.${locationClause}\n\n` +
                `**Step 1 — Payments:** Use the \`get_sales_payments\` tool to pull payment data for the period.\n\n` +
                `**Step 2 — Sales context:** Use the \`get_sales\` tool to get total revenue for context.\n\n` +
                `**Present the analysis with:**\n` +
                `- **Payment method summary** — table showing each method (cash, credit, debit, gift card, etc.) ` +
                `with total amount and percentage of revenue\n` +
                `- **Daily trend** — are cash payments increasing or decreasing?\n` +
                `- **Insights** — high cash percentage could indicate tip reporting considerations, ` +
                `high third-party delivery payments may mean commission costs to watch\n\n` +
                (extra_instructions
                  ? `**Additional instructions from the user:** ${extra_instructions}\n`
                  : ""),
            },
          },
        ],
      };
    }
  );

  // ------------------------------------------------------------------
  // /team-roster
  // Endpoints: get_employees, get_job_titles, get_locations
  // ------------------------------------------------------------------
  server.prompt(
    "team-roster",
    "Team overview: current employees by location and role, job titles, " +
      "hire dates, and staffing levels.",
    {
      location: z
        .string()
        .optional()
        .describe("Filter to a specific location name."),
      extra_instructions: z
        .string()
        .optional()
        .describe("Any additional instructions for how to analyze or present the data."),
    },
    ({ location, extra_instructions }) => {
      const locationClause = location
        ? ` Focus on the "${location}" location.`
        : " Show all locations.";

      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text:
                `Generate a team roster overview.${locationClause}\n\n` +
                `**Step 1 — Locations:** Use the \`get_locations\` tool to get all locations.\n\n` +
                `**Step 2 — Employees:** Use the \`get_employees\` tool to get all employee records.\n\n` +
                `**Step 3 — Job titles:** Use the \`get_job_titles\` tool to get role definitions and pay rates.\n\n` +
                `**Present as:**\n` +
                `- **Headcount by location** (table)\n` +
                `- **Breakdown by role** (managers, servers, cooks, etc.)\n` +
                `- **Recent hires** (last 30 days)\n` +
                `- **Tenure insights** — average tenure, longest-tenured employees\n\n` +
                (extra_instructions
                  ? `**Additional instructions from the user:** ${extra_instructions}\n`
                  : ""),
            },
          },
        ],
      };
    }
  );
}
