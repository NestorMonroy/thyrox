// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{Te}from"/$bunfs/root/chunk-d37h8mav.js";import{st,Ue,x,_d}from"/$bunfs/root/chunk-swk3rjnt.js";import{a}from"/$bunfs/root/chunk-8whxj5sg.js";function o(){let e=_d()?.pewter_owl_model;if(typeof e==="string"&&e!=="")return e;return x("tengu_pewter_owl_model","")}function r(e){if(a.CLAUDE_CODE_PEWTER_OWL!==void 0)return a.CLAUDE_CODE_PEWTER_OWL;if(Te())return!1;let t=o();if(t!==""&&!Ue(st()).includes(t))return!1;return x(`tengu_${e}`,!1)||_d()?.[e]===!0}function SAe(){if(a.CLAUDE_CODE_PEWTER_OWL_TOOL!==void 0)return a.CLAUDE_CODE_PEWTER_OWL_TOOL;return r("pewter_owl_tool")}function xHr(){return r("pewter_owl_brief")}
export{SAe,xHr};
