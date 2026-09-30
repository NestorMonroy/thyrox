// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{Re}from"/$bunfs/root/chunk-t8q7n4ta.js";import{et,Ue,I,Tl}from"/$bunfs/root/chunk-btbsn9s4.js";import{a}from"/$bunfs/root/chunk-9fmxymtw.js";function o(){let e=Tl()?.pewter_owl_model;if(typeof e==="string"&&e!=="")return e;return I("tengu_pewter_owl_model","")}function r(e){if(a.CLAUDE_CODE_PEWTER_OWL!==void 0)return a.CLAUDE_CODE_PEWTER_OWL;if(Re())return!1;let t=o();if(t!==""&&!Ue(et()).includes(t))return!1;return I(`tengu_${e}`,!1)||Tl()?.[e]===!0}function Pme(){if(a.CLAUDE_CODE_PEWTER_OWL_TOOL!==void 0)return a.CLAUDE_CODE_PEWTER_OWL_TOOL;return r("pewter_owl_tool")}function yEn(){return r("pewter_owl_brief")}
export{Pme,yEn};
