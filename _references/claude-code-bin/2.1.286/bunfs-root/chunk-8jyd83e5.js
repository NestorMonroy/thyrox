// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{F,P4o}from"/$bunfs/root/chunk-616rkgbc.js";import{t}from"/$bunfs/root/chunk-6w550002.js";import{we,Epe}from"/$bunfs/root/chunk-xz4v1m80.js";import{a}from"/$bunfs/root/chunk-v5r4yd9z.js";function _1r(e=l6n){let o=a.CLAUDE_CODE_HOVER_REST;if(o===void 0)return;if(a6n(o)!=="pinned")return;return{backend:F()?e():void 0,configHome:we()}}function b1r(e){let o=F()?e.backend:void 0;if(o===void 0)return;if(!Epe(e.configHome)){t(`CLAUDE_CONFIG_DIR now names ${we()}, not ${e.configHome} where the v5 storage backend was built at start-up; not handing it on, so this process keeps today's direct file access`,{level:"warn"});return}return o}function a6n(e){if(typeof e!=="boolean")t(`tengu_hover_rest served a ${typeof e}, not a boolean; treating it as off`,{level:"warn"});let o=P4o(e);if(o==="conflict")t(`tengu_hover_rest read ${String(e)} at a second pin in this process; keeping the first decision`,{level:"warn"});return o}function l6n(){if(!F())return;return}export{_1r,b1r,a6n,l6n};
