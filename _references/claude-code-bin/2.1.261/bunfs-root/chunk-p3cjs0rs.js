// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{O,aur}from"/$bunfs/root/chunk-x7f60hk6.js";import{n}from"/$bunfs/root/chunk-y5pwxex8.js";import{Se,Sye}from"/$bunfs/root/chunk-fvzv4ke0.js";import{a}from"/$bunfs/root/chunk-a207t0vs.js";function YLn(e=OYt){let o=a.CLAUDE_CODE_HOVER_REST;if(o===void 0)return;if(MYt(o)!=="pinned")return;return{backend:O()?e():void 0,configHome:Se()}}function XLn(e){let o=O()?e.backend:void 0;if(o===void 0)return;if(!Sye(e.configHome)){n(`CLAUDE_CONFIG_DIR now names ${Se()}, not ${e.configHome} where the v5 storage backend was built at start-up; not handing it on, so this process keeps today's direct file access`,{level:"warn"});return}return o}function MYt(e){if(typeof e!=="boolean")n(`tengu_hover_rest served a ${typeof e}, not a boolean; treating it as off`,{level:"warn"});let o=aur(e);if(o==="conflict")n(`tengu_hover_rest read ${String(e)} at a second pin in this process; keeping the first decision`,{level:"warn"});return o}function OYt(){if(!O())return;return}export{YLn,XLn,MYt,OYt};
