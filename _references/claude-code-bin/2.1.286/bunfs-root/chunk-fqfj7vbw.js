// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{vo}from"/$bunfs/root/chunk-4hjp8tw4.js";import{a}from"/$bunfs/root/chunk-v5r4yd9z.js";import{V1e}from"/$bunfs/root/chunk-fresvh3b.js";import{Co}from"/$bunfs/root/chunk-xb9gk5ty.js";var _jr=25000,bjr=128;class TRe extends Error{tokenCount;maxTokens;constructor(e,t){super(`File content (${e} tokens) exceeds maximum allowed tokens (${t}). Use offset and limit parameters to read specific portions of the file, or search for specific content instead of reading the whole file.`);this.tokenCount=e;this.maxTokens=t;this.name="MaxFileReadTokenExceededError"}}var n=new WeakMap;function Sjr(e,t){n.set(e,t)}function vUo(e){return n.get(e)}function r(){let e=a.CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS;if(e!==void 0&&e>0)return e;return}function n7(){let e=Co();return e.defaultFileReadingLimits??={maxSizeBytes:V1e,maxTokens:r()??_jr},e.defaultFileReadingLimits}function B8e(){return vo("tengu_tab_read_sep",!1)}
export{_jr,bjr,TRe,Sjr,vUo,n7,B8e};
