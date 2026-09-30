// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{qs}from"/$bunfs/root/chunk-t6pwageh.js";import{a}from"/$bunfs/root/chunk-v49zfq06.js";import{BFe}from"/$bunfs/root/chunk-nhz4atva.js";import{bo}from"/$bunfs/root/chunk-r5p5y4t8.js";var jDr=25000,WDr=128;class GAe extends Error{tokenCount;maxTokens;constructor(e,t){super(`File content (${e} tokens) exceeds maximum allowed tokens (${t}). Use offset and limit parameters to read specific portions of the file, or search for specific content instead of reading the whole file.`);this.tokenCount=e;this.maxTokens=t;this.name="MaxFileReadTokenExceededError"}}var n=new WeakMap;function lOo(e,t){n.set(e,t)}function cOo(e){return n.get(e)}function r(){let e=a.CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS;if(e!==void 0&&e>0)return e;return}function zX(){let e=bo();return e.defaultFileReadingLimits??={maxSizeBytes:BFe,maxTokens:r()??jDr},e.defaultFileReadingLimits}function q5e(){return qs("tengu_tab_read_sep",!1)}
export{jDr,WDr,GAe,lOo,cOo,zX,q5e};
