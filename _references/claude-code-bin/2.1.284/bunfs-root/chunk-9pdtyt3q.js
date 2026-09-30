// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{di,x}from"/$bunfs/root/chunk-swk3rjnt.js";import{Le}from"/$bunfs/root/chunk-37s48y77.js";import{a}from"/$bunfs/root/chunk-8whxj5sg.js";import{O}from"/$bunfs/root/chunk-320rdak1.js";function qs(){let e=a.CLAUDE_CODE_HARBOR_KITE;if(e!==void 0)return Le(e);if(O()==="windows"&&!x("tengu_harbor_kite_win",!0))return!1;return x("tengu_harbor_kite",!0)}function Cte(e){if(e?.flagsSettled===!1&&di("tengu_cuddly_willow",!0).source==="fallback")return!1;return x("tengu_cuddly_willow",!0)}var ODt="Cross-session messaging is not available in this session.";
export{qs,Cte,ODt};
