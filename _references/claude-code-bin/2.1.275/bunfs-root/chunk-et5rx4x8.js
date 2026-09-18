// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{p}from"/$bunfs/root/chunk-dtjhjxgx.js";import{o,k,H,C,u}from"/$bunfs/root/chunk-nfxfp8ap.js";var e=p(()=>u({path:o(),text:o(),chars:k().int().min(0),clipped:H().optional()}));function rIt(){return{init_references:u({docs:C(e()),unavailable:C(u({path:o(),why:o()})).optional()}).optional()}}function oIt(){return{design_system:u({url:o().optional(),default:o().optional(),title:o().optional(),store:H().optional(),docs:C(e()).optional(),unavailable:o().optional()}).optional()}}var t=p(()=>u({dir:o(),files:C(u({path:o(),bytes:k()})),skipped:C(u({path:o(),reason:o()}))})),sIt=p(()=>u({type:t().optional(),system_url:o().optional(),system:t().optional(),skill_in_result:H(),capabilities_skill:H(),repl_tool:H().optional()}));
export{rIt,oIt,sIt};
