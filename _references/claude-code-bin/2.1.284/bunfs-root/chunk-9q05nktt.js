// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{f}from"/$bunfs/root/chunk-k40f9rxb.js";import{o,k,H,A,u}from"/$bunfs/root/chunk-fwjxbyrt.js";var e=f(()=>u({path:o(),text:o(),chars:k().int().min(0),clipped:H().optional()}));function b5t(){return{init_references:u({docs:A(e()),unavailable:A(u({path:o(),why:o()})).optional()}).optional()}}function Zwt(){return{design_system:u({url:o().optional(),default:o().optional(),title:o().optional(),store:H().optional(),docs:A(e()).optional(),unavailable:o().optional()}).optional()}}var t=f(()=>u({dir:o(),files:A(u({path:o(),bytes:k()})),skipped:A(u({path:o(),reason:o()}))})),S5t=f(()=>u({type:t().optional(),system_url:o().optional(),system:t().optional(),skill_in_result:H(),capabilities_skill:H(),repl_tool:H().optional()}));
export{b5t,Zwt,S5t};
