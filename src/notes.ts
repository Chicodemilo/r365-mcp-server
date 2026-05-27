/**
 * Notes tools — let Claude save and read business context over time.
 *
 * Claude Desktop does NOT have memory between conversations. These tools
 * give it a persistent scratchpad (.instructions.md) so it can remember
 * things the user tells it about their business.
 *
 * HOW IT WORKS:
 *   - save_note   → appends a line to .instructions.md
 *   - read_notes  → reads the full .instructions.md file back
 *   - clear_notes → resets the file to the default header
 *
 * The file lives in the project root (next to .env) and is gitignored.
 * It persists between conversations — anything Claude saves is there
 * next time the user opens Claude Desktop.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v3";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const NOTES_PATH = join(__dirname, "..", ".instructions.md");

const DEFAULT_HEADER = `# Business Context

This file is maintained by Claude. It stores things learned about your
business during conversations so they carry over to future sessions.

You can also edit this file directly — just keep the markdown format.

---

`;

function ensureFile(): void {
  if (!existsSync(NOTES_PATH)) {
    writeFileSync(NOTES_PATH, DEFAULT_HEADER, "utf-8");
  }
}

function readNotes(): string {
  ensureFile();
  return readFileSync(NOTES_PATH, "utf-8");
}

export function registerNoteTools(server: McpServer) {
  // ---- save_note ----
  server.tool(
    "save_note",
    "Save a piece of business context for future conversations. " +
      "USE THIS WHEN the user tells you something worth remembering: " +
      "location names, metrics they care about, reporting preferences, " +
      "people's roles, known issues, seasonal patterns, or anything " +
      "that would help you give better answers next time. " +
      "Write the note in your own words — short, factual, useful. " +
      "DO NOT save sensitive data (passwords, SSNs, financial account numbers).",
    {
      category: z
        .enum([
          "business",
          "locations",
          "people",
          "metrics",
          "preferences",
          "issues",
          "other",
        ])
        .describe(
          "Category for the note. " +
            "business = general info about the company. " +
            "locations = location names, details, comparisons. " +
            "people = staff, roles, contacts. " +
            "metrics = KPIs, targets, benchmarks they track. " +
            "preferences = how they like reports, what to focus on. " +
            "issues = known problems, things to watch for. " +
            "other = anything else."
        ),
      note: z
        .string()
        .describe(
          "The note to save. Keep it short and factual. " +
            "Example: 'Mueller location opened Dec 2024, still ramping up' " +
            "Example: 'Owner wants food cost under 30%, currently running 33%' " +
            "Example: 'Prefers weekly reports broken down by location'"
        ),
    },
    async ({ category, note }) => {
      ensureFile();
      const current = readFileSync(NOTES_PATH, "utf-8");
      const timestamp = new Date().toISOString().split("T")[0];
      const entry = `- [${category}] ${note} _(saved ${timestamp})_\n`;

      // Check for duplicate — don't save the same note twice
      if (current.includes(note)) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Note already exists — skipped duplicate.",
            },
          ],
        };
      }

      writeFileSync(NOTES_PATH, current + entry, "utf-8");
      return {
        content: [
          {
            type: "text" as const,
            text: `Saved: [${category}] ${note}`,
          },
        ],
      };
    }
  );

  // ---- read_notes ----
  server.tool(
    "read_notes",
    "Read all saved business context notes. " +
      "CALL THIS AT THE START OF A CONVERSATION if the user asks about " +
      "their business or references something you should already know. " +
      "Also call this before save_note to avoid duplicates.",
    {},
    async () => {
      const content = readNotes();
      const hasNotes = content.includes("- [");
      return {
        content: [
          {
            type: "text" as const,
            text: hasNotes
              ? content
              : "No notes saved yet. As you learn about this business, use save_note to remember key details.",
          },
        ],
      };
    }
  );

  // ---- clear_notes ----
  server.tool(
    "clear_notes",
    "Reset all saved notes. ONLY use when the user explicitly asks to clear or reset notes.",
    {},
    async () => {
      writeFileSync(NOTES_PATH, DEFAULT_HEADER, "utf-8");
      return {
        content: [
          {
            type: "text" as const,
            text: "All notes cleared.",
          },
        ],
      };
    }
  );
}
