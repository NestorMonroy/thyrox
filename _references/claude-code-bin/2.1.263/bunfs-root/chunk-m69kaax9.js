// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{O,uur}from"/$bunfs/root/chunk-m3vzz9tz.js";import{n}from"/$bunfs/root/chunk-mh9y4c2z.js";import{Se,Hye}from"/$bunfs/root/chunk-jmxayrtv.js";import{a}from"/$bunfs/root/chunk-bxegdt3f.js";function JLn(e=NYt){let o=a.CLAUDE_CODE_HOVER_REST;if(o===void 0)return;if(OYt(o)!=="pinned")return;return{backend:O()?e():void 0,configHome:Se()}}function QLn(e){let o=O()?e.backend:void 0;if(o===void 0)return;if(!Hye(e.configHome)){n(`CLAUDE_CONFIG_DIR now names ${Se()}, not ${e.configHome} where the v5 storage backend was built at start-up; not handing it on, so this process keeps today's direct file access`,{level:"warn"});return}return o}function OYt(e){if(typeof e!=="boolean")n(`tengu_hover_rest served a ${typeof e}, not a boolean; treating it as off`,{level:"warn"});let o=uur(e);if(o==="conflict")n(`tengu_hover_rest read ${String(e)} at a second pin in this process; keeping the first decision`,{level:"warn"});return o}function NYt(){if(!O())return;return}export{JLn,QLn,OYt,NYt};
