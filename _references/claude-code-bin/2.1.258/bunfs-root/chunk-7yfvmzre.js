// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{Pe}from"/$bunfs/root/chunk-b1z7jvb2.js";import{at,Ve,L,ic}from"/$bunfs/root/chunk-8qt7d28b.js";import{a}from"/$bunfs/root/chunk-sr28hb79.js";function o(){let e=ic()?.pewter_owl_model;if(typeof e==="string"&&e!=="")return e;return L("tengu_pewter_owl_model","")}function r(e){if(a.CLAUDE_CODE_PEWTER_OWL!==void 0)return a.CLAUDE_CODE_PEWTER_OWL;if(Pe())return!1;let t=o();if(t!==""&&!Ve(at()).includes(t))return!1;return L(`tengu_${e}`,!1)||ic()?.[e]===!0}function Xfe(){if(a.CLAUDE_CODE_PEWTER_OWL_TOOL!==void 0)return a.CLAUDE_CODE_PEWTER_OWL_TOOL;return r("pewter_owl_tool")}function J_n(){return r("pewter_owl_brief")}
export{Xfe,J_n};
