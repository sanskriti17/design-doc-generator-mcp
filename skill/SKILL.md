---
name: design-doc
description: Generate a technical design doc (problem statement, approach, architecture diagram, trade-offs, open questions) from the real technical work done in this session, and save it into the project. Use when the user runs /design-doc, with optional flags --html, --activate KEY, or --help.
---

# /design-doc

Turns the technical work already done in this session into a saved design doc, via the `design-doc-generator-mcp`
MCP server (`prepare_design_doc`, `save_design_doc`, `activate_license`). Your code stays local - the backend
only ever receives a mode/tier string or a license key. You (Claude) write the actual document.

If the tools aren't registered, tell the user to run `npx design-doc-generator-mcp init` - don't fake the behavior.

## Step 1 - parse the invocation

Recognize, in the trailing text: `--help` (go to Help, stop, no tool call), `--activate <KEY>` (go to
Activation), `--html` (also wants a standalone HTML export). Otherwise infer `mode` from context - "root
cause"/"investigate"/"debug" → `root-cause`; "compare"/"which approach"/"options" → `comparison`; else
`default`.

## Help (only if `--help`)

Summarize, don't quote verbatim: turns session work into a saved doc, no copy-pasting. Flags: `--html` (also
saves an interactive HTML version), `--activate YOUR-KEY`, `--help`. Saved to `docs/<title>.md` (re-running it
updates that file). Free tier has a daily generation cap; Pro removes it - that's the only difference. Run cold
with nothing done yet this session? Ask what to document instead of refusing (see Step 2).

## Step 2 - sanity check

Proceed directly if real work already happened earlier this session - that's the source, skip to Step 4.

If run cold (nothing substantial discussed yet), don't invent content and don't just refuse - use
AskUserQuestion with exactly these choices:
- **This session's discussion** - draft from whatever's actually been discussed so far, even if thin
- **This repo** - explore it yourself (README, structure, manifest, recent git log, key source files) and
  document its current state
- **Latest git commit** - run `git show HEAD` (or equivalent) yourself and document specifically what that
  commit changed and why, from its diff and message

Whichever is chosen becomes the `sessionSummary` in Step 4. For "This repo" or "Latest git commit," expect
sections like Key Decisions/Assumptions to end up mostly omitted - describing existing work, not live decisions,
is expected.

## Step 3 - Activation (only if `--activate`)

Call `activate_license` with the key, relay its result to the user verbatim, and stop - don't also generate a
doc in the same invocation.

## Step 4 - prepare

Call `prepare_design_doc` with `mode` (from Step 1) and `sessionSummary` - your own specific summary of the
problem, what changed, and any alternatives/open issues discussed. Reference real files/functions, not
boilerplate.

Follow everything the tool returns exactly - sections, guidance, drafting rules, formatting, and its security
handling for the "REPO CONTEXT" block - none of it is duplicated here, so it can never go stale. On error (daily
limit reached, or backend unreachable), relay the message to the user as-is and stop - don't draft anyway.

## Step 5 - draft

Write the markdown yourself, exactly as the tool's returned instructions specify.

## Step 6 - save

Call `save_design_doc` with `markdown` and `wantsHtml` (from Step 1). Tell the user warmly where it saved and
what's in it - don't reprint the document or the tool's raw output.
