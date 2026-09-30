// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{f}from"/$bunfs/root/chunk-f344jh32.js";import{x}from"/$bunfs/root/chunk-wbbthbh9.js";import{Yd}from"/$bunfs/root/chunk-g5a1w94e.js";import{o,C,d}from"/$bunfs/root/chunk-hq4c63ht.js";var l=f(()=>C(d({marketplace:o(),plugin:o()})));function Eyn(){let e=x("tengu_harbor_ledger",[]),n=l().safeParse(e);return n.success?n.data:[]}function sJ(){return x("tengu_harbor",!1)}function igt(e){if(!e)return!1;let{name:n,marketplace:t}=Yd(e);if(!t)return!1;return Eyn().some((r)=>r.plugin===n&&r.marketplace===t)}
export{Eyn,sJ,igt};
