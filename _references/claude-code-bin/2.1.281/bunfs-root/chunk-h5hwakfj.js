// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{F,PCo}from"/$bunfs/root/chunk-7yckkh1m.js";import{t}from"/$bunfs/root/chunk-wfscmafr.js";import{we,Vae}from"/$bunfs/root/chunk-8bp13hnn.js";import{a}from"/$bunfs/root/chunk-ay603yys.js";function Ckr(e=TFn){let o=a.CLAUDE_CODE_HOVER_REST;if(o===void 0)return;if(kFn(o)!=="pinned")return;return{backend:F()?e():void 0,configHome:we()}}function Rkr(e){let o=F()?e.backend:void 0;if(o===void 0)return;if(!Vae(e.configHome)){t(`CLAUDE_CONFIG_DIR now names ${we()}, not ${e.configHome} where the v5 storage backend was built at start-up; not handing it on, so this process keeps today's direct file access`,{level:"warn"});return}return o}function kFn(e){if(typeof e!=="boolean")t(`tengu_hover_rest served a ${typeof e}, not a boolean; treating it as off`,{level:"warn"});let o=PCo(e);if(o==="conflict")t(`tengu_hover_rest read ${String(e)} at a second pin in this process; keeping the first decision`,{level:"warn"});return o}function TFn(){if(!F())return;return}export{Ckr,Rkr,kFn,TFn};
