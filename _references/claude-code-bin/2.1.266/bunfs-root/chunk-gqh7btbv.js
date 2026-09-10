// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{m}from"/$bunfs/root/chunk-7tpgnqqk.js";import{I}from"/$bunfs/root/chunk-btbsn9s4.js";import{Np}from"/$bunfs/root/chunk-hzw08x3w.js";import{s,T,c}from"/$bunfs/root/chunk-44xw78rx.js";var l=m(()=>T(c({marketplace:s(),plugin:s()})));function XUt(){let e=I("tengu_harbor_ledger",[]),n=l().safeParse(e);return n.success?n.data:[]}function Pq(){return I("tengu_harbor",!1)}function ucn(e){if(!e)return!1;let{name:n,marketplace:t}=Np(e);if(!t)return!1;return XUt().some((r)=>r.plugin===n&&r.marketplace===t)}
export{XUt,Pq,ucn};
