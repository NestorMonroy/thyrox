// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{Te}from"/$bunfs/root/chunk-4qqe0nh4.js";import{nt,We,I,eu}from"/$bunfs/root/chunk-xbd48fav.js";import{a}from"/$bunfs/root/chunk-crr3rzxx.js";function o(){let e=eu()?.pewter_owl_model;if(typeof e==="string"&&e!=="")return e;return I("tengu_pewter_owl_model","")}function r(e){if(a.CLAUDE_CODE_PEWTER_OWL!==void 0)return a.CLAUDE_CODE_PEWTER_OWL;if(Te())return!1;let t=o();if(t!==""&&!We(nt()).includes(t))return!1;return I(`tengu_${e}`,!1)||eu()?.[e]===!0}function hge(){if(a.CLAUDE_CODE_PEWTER_OWL_TOOL!==void 0)return a.CLAUDE_CODE_PEWTER_OWL_TOOL;return r("pewter_owl_tool")}function N9n(){return r("pewter_owl_brief")}
export{hge,N9n};
