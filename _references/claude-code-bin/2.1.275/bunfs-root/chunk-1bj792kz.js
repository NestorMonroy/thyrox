// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{Fc}from"/$bunfs/root/chunk-xbd48fav.js";import{a}from"/$bunfs/root/chunk-crr3rzxx.js";import{VRe}from"/$bunfs/root/chunk-hbrq69f0.js";import{vs}from"/$bunfs/root/chunk-2pr871ag.js";var Ber=25000,jer=128;class Ihe extends Error{tokenCount;maxTokens;constructor(e,t){super(`File content (${e} tokens) exceeds maximum allowed tokens (${t}). Use offset and limit parameters to read specific portions of the file, or search for specific content instead of reading the whole file.`);this.tokenCount=e;this.maxTokens=t;this.name="MaxFileReadTokenExceededError"}}var n=new WeakMap;function fKr(e,t){n.set(e,t)}function mKr(e){return n.get(e)}function r(){let e=a.CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS;if(e!==void 0&&e>0)return e;return}function A3(){let e=vs();return e.defaultFileReadingLimits??={maxSizeBytes:VRe,maxTokens:r()??Ber},e.defaultFileReadingLimits}function cXe(){return Fc("tengu_tab_read_sep",!1)}
export{Ber,jer,Ihe,fKr,mKr,A3,cXe};
