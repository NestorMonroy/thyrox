// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{N,Jgr}from"/$bunfs/root/chunk-m3k3498d.js";import{t}from"/$bunfs/root/chunk-fy3j7rz0.js";import{Se,sbe}from"/$bunfs/root/chunk-qsnhycbm.js";import{a}from"/$bunfs/root/chunk-9fmxymtw.js";function VDn(e=$7t){let o=a.CLAUDE_CODE_HOVER_REST;if(o===void 0)return;if(L7t(o)!=="pinned")return;return{backend:N()?e():void 0,configHome:Se()}}function KDn(e){let o=N()?e.backend:void 0;if(o===void 0)return;if(!sbe(e.configHome)){t(`CLAUDE_CONFIG_DIR now names ${Se()}, not ${e.configHome} where the v5 storage backend was built at start-up; not handing it on, so this process keeps today's direct file access`,{level:"warn"});return}return o}function L7t(e){if(typeof e!=="boolean")t(`tengu_hover_rest served a ${typeof e}, not a boolean; treating it as off`,{level:"warn"});let o=Jgr(e);if(o==="conflict")t(`tengu_hover_rest read ${String(e)} at a second pin in this process; keeping the first decision`,{level:"warn"});return o}function $7t(){if(!N())return;return}export{VDn,KDn,L7t,$7t};
