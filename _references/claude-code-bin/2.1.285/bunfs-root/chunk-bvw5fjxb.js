// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{p}from"/$bunfs/root/chunk-z10rc4tf.js";import{o,T,H,C,d}from"/$bunfs/root/chunk-ea52y7e7.js";var e=p(()=>d({path:o(),text:o(),chars:T().int().min(0),clipped:H().optional()}));function i5t(){return{init_references:d({docs:C(e()),unavailable:C(d({path:o(),why:o()})).optional()}).optional()}}function tvt(){return{design_system:d({url:o().optional(),default:o().optional(),title:o().optional(),store:H().optional(),docs:C(e()).optional(),unavailable:o().optional()}).optional()}}var t=p(()=>d({dir:o(),files:C(d({path:o(),bytes:T()})),skipped:C(d({path:o(),reason:o()}))})),a5t=p(()=>d({type:t().optional(),system_url:o().optional(),system:t().optional(),skill_in_result:H(),capabilities_skill:H(),repl_tool:H().optional()}));
export{i5t,tvt,a5t};
