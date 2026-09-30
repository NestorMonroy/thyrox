// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{Lo}from"/$bunfs/root/chunk-f74xvn8g.js";import{a}from"/$bunfs/root/chunk-5054mktj.js";import{LBe}from"/$bunfs/root/chunk-g768q95w.js";import{Co}from"/$bunfs/root/chunk-ff0zt7cd.js";var XFr=25000,JFr=128;class HCe extends Error{tokenCount;maxTokens;constructor(e,t){super(`File content (${e} tokens) exceeds maximum allowed tokens (${t}). Use offset and limit parameters to read specific portions of the file, or search for specific content instead of reading the whole file.`);this.tokenCount=e;this.maxTokens=t;this.name="MaxFileReadTokenExceededError"}}var n=new WeakMap;function QFr(e,t){n.set(e,t)}function j0o(e){return n.get(e)}function r(){let e=a.CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS;if(e!==void 0&&e>0)return e;return}function xJ(){let e=Co();return e.defaultFileReadingLimits??={maxSizeBytes:LBe,maxTokens:r()??XFr},e.defaultFileReadingLimits}function kYe(){return Lo("tengu_tab_read_sep",!1)}
export{XFr,JFr,HCe,QFr,j0o,xJ,kYe};
