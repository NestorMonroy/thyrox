// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{na}from"/$bunfs/root/chunk-5khn4tvf.js";import{a}from"/$bunfs/root/chunk-ay603yys.js";import{nLe}from"/$bunfs/root/chunk-bg3bhqbb.js";import{jo}from"/$bunfs/root/chunk-7qxbq1fh.js";var kTr=25000,TTr=128;class bEe extends Error{tokenCount;maxTokens;constructor(e,t){super(`File content (${e} tokens) exceeds maximum allowed tokens (${t}). Use offset and limit parameters to read specific portions of the file, or search for specific content instead of reading the whole file.`);this.tokenCount=e;this.maxTokens=t;this.name="MaxFileReadTokenExceededError"}}var n=new WeakMap;function Hyo(e,t){n.set(e,t)}function Oyo(e){return n.get(e)}function r(){let e=a.CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS;if(e!==void 0&&e>0)return e;return}function v8(){let e=jo();return e.defaultFileReadingLimits??={maxSizeBytes:nLe,maxTokens:r()??kTr},e.defaultFileReadingLimits}function Qqe(){return na("tengu_tab_read_sep",!1)}
export{kTr,TTr,bEe,Hyo,Oyo,v8,Qqe};
