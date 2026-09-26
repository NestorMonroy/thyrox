// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{oi}from"/$bunfs/root/chunk-wbbthbh9.js";import{a}from"/$bunfs/root/chunk-h56wjcte.js";import{HNe}from"/$bunfs/root/chunk-yksx95h7.js";import{_o}from"/$bunfs/root/chunk-pvy21nwr.js";var Oxr=25000,Mxr=128;class $ke extends Error{tokenCount;maxTokens;constructor(e,t){super(`File content (${e} tokens) exceeds maximum allowed tokens (${t}). Use offset and limit parameters to read specific portions of the file, or search for specific content instead of reading the whole file.`);this.tokenCount=e;this.maxTokens=t;this.name="MaxFileReadTokenExceededError"}}var n=new WeakMap;function Vvo(e,t){n.set(e,t)}function qvo(e){return n.get(e)}function r(){let e=a.CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS;if(e!==void 0&&e>0)return e;return}function p9(){let e=_o();return e.defaultFileReadingLimits??={maxSizeBytes:HNe,maxTokens:r()??Oxr},e.defaultFileReadingLimits}function E4e(){return oi("tengu_tab_read_sep",!1)}
export{Oxr,Mxr,$ke,Vvo,qvo,p9,E4e};
