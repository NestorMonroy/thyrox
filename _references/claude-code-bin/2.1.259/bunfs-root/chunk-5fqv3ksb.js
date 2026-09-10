// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
function wdt(e,s){return{behavior:"deny",message:`Permission for ${e} requires the user to read a consent disclosure before approving, and ${s} cannot display it. The user can run this from an interactive Claude Code session, where the permission dialog renders the full disclosure.`,decisionReason:{type:"other",reason:`localDisplayOnly ask not forwarded: ${s} cannot render the consent disclosure the approval depends on`}}}function XWn(e){return e.startsWith("localDisplayOnly ask not forwarded:")}
export{wdt,XWn};
