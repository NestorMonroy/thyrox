// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{Oo}from"/$bunfs/root/chunk-swk3rjnt.js";import{a}from"/$bunfs/root/chunk-8whxj5sg.js";import{oBe}from"/$bunfs/root/chunk-qcjafqk2.js";import{ko}from"/$bunfs/root/chunk-j70276wn.js";var KFr=25000,YFr=128;class eRe extends Error{tokenCount;maxTokens;constructor(e,t){super(`File content (${e} tokens) exceeds maximum allowed tokens (${t}). Use offset and limit parameters to read specific portions of the file, or search for specific content instead of reading the whole file.`);this.tokenCount=e;this.maxTokens=t;this.name="MaxFileReadTokenExceededError"}}var n=new WeakMap;function XFr(e,t){n.set(e,t)}function lLo(e){return n.get(e)}function r(){let e=a.CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS;if(e!==void 0&&e>0)return e;return}function AJ(){let e=ko();return e.defaultFileReadingLimits??={maxSizeBytes:oBe,maxTokens:r()??KFr},e.defaultFileReadingLimits}function CYe(){return Oo("tengu_tab_read_sep",!1)}
export{KFr,YFr,eRe,XFr,lLo,AJ,CYe};
