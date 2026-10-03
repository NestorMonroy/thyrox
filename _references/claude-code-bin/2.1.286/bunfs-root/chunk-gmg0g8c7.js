// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{p}from"/$bunfs/root/chunk-159k5j1y.js";import{wd}from"/$bunfs/root/chunk-t9e08syq.js";import{R}from"/$bunfs/root/chunk-4hjp8tw4.js";import{o,A,u}from"/$bunfs/root/chunk-cgbfr9c2.js";var l=p(()=>A(u({marketplace:o(),plugin:o()})));function pPn(){let e=R("tengu_harbor_ledger",[]),n=l().safeParse(e);return n.success?n.data:[]}function wZ(){return R("tengu_harbor",!1)}function Ukt(e){if(!e)return!1;let{name:n,marketplace:t}=wd(e);if(!t)return!1;return pPn().some((r)=>r.plugin===n&&r.marketplace===t)}
export{pPn,wZ,Ukt};
