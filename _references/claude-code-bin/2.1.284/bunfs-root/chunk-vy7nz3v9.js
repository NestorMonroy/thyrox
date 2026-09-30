// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{N,Lzo}from"/$bunfs/root/chunk-0pd7kjzx.js";import{t}from"/$bunfs/root/chunk-6b6gfk00.js";import{Se,Fue}from"/$bunfs/root/chunk-0j2vcydt.js";import{a}from"/$bunfs/root/chunk-8whxj5sg.js";function eFr(e=z4n){let o=a.CLAUDE_CODE_HOVER_REST;if(o===void 0)return;if(G4n(o)!=="pinned")return;return{backend:N()?e():void 0,configHome:Se()}}function tFr(e){let o=N()?e.backend:void 0;if(o===void 0)return;if(!Fue(e.configHome)){t(`CLAUDE_CONFIG_DIR now names ${Se()}, not ${e.configHome} where the v5 storage backend was built at start-up; not handing it on, so this process keeps today's direct file access`,{level:"warn"});return}return o}function G4n(e){if(typeof e!=="boolean")t(`tengu_hover_rest served a ${typeof e}, not a boolean; treating it as off`,{level:"warn"});let o=Lzo(e);if(o==="conflict")t(`tengu_hover_rest read ${String(e)} at a second pin in this process; keeping the first decision`,{level:"warn"});return o}function z4n(){if(!N())return;return}export{eFr,tFr,G4n,z4n};
