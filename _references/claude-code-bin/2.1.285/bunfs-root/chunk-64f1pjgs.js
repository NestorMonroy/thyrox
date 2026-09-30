// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{p}from"/$bunfs/root/chunk-z10rc4tf.js";import{vd}from"/$bunfs/root/chunk-2sb5hqyj.js";import{x}from"/$bunfs/root/chunk-f74xvn8g.js";import{o,C,d}from"/$bunfs/root/chunk-ea52y7e7.js";var l=p(()=>C(d({marketplace:o(),plugin:o()})));function sCn(){let e=x("tengu_harbor_ledger",[]),n=l().safeParse(e);return n.success?n.data:[]}function xQ(){return x("tengu_harbor",!1)}function Lwt(e){if(!e)return!1;let{name:n,marketplace:t}=vd(e);if(!t)return!1;return sCn().some((r)=>r.plugin===n&&r.marketplace===t)}
export{sCn,xQ,Lwt};
