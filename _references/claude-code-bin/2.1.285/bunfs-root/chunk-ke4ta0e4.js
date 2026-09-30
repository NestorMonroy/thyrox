// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{L,K2o}from"/$bunfs/root/chunk-k3gp1qmc.js";import{t}from"/$bunfs/root/chunk-055ns4k8.js";import{we,$ue}from"/$bunfs/root/chunk-v34cw0y6.js";import{a}from"/$bunfs/root/chunk-5054mktj.js";function X$r(e=o4n){let o=a.CLAUDE_CODE_HOVER_REST;if(o===void 0)return;if(r4n(o)!=="pinned")return;return{backend:L()?e():void 0,configHome:we()}}function J$r(e){let o=L()?e.backend:void 0;if(o===void 0)return;if(!$ue(e.configHome)){t(`CLAUDE_CONFIG_DIR now names ${we()}, not ${e.configHome} where the v5 storage backend was built at start-up; not handing it on, so this process keeps today's direct file access`,{level:"warn"});return}return o}function r4n(e){if(typeof e!=="boolean")t(`tengu_hover_rest served a ${typeof e}, not a boolean; treating it as off`,{level:"warn"});let o=K2o(e);if(o==="conflict")t(`tengu_hover_rest read ${String(e)} at a second pin in this process; keeping the first decision`,{level:"warn"});return o}function o4n(){if(!L())return;return}export{X$r,J$r,r4n,o4n};
