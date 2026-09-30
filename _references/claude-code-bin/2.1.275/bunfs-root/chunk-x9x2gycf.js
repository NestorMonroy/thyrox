// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{F,mJr}from"/$bunfs/root/chunk-h401nbms.js";import{t}from"/$bunfs/root/chunk-4bbpt7sc.js";import{ve,jIe}from"/$bunfs/root/chunk-6ghkw3jc.js";import{a}from"/$bunfs/root/chunk-crr3rzxx.js";function eer(e=qSn){let o=a.CLAUDE_CODE_HOVER_REST;if(o===void 0)return;if(GSn(o)!=="pinned")return;return{backend:F()?e():void 0,configHome:ve()}}function ter(e){let o=F()?e.backend:void 0;if(o===void 0)return;if(!jIe(e.configHome)){t(`CLAUDE_CONFIG_DIR now names ${ve()}, not ${e.configHome} where the v5 storage backend was built at start-up; not handing it on, so this process keeps today's direct file access`,{level:"warn"});return}return o}function GSn(e){if(typeof e!=="boolean")t(`tengu_hover_rest served a ${typeof e}, not a boolean; treating it as off`,{level:"warn"});let o=mJr(e);if(o==="conflict")t(`tengu_hover_rest read ${String(e)} at a second pin in this process; keeping the first decision`,{level:"warn"});return o}function qSn(){if(!F())return;return}export{eer,ter,GSn,qSn};
