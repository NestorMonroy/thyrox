// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{f}from"/$bunfs/root/chunk-bnk68ax9.js";import{x}from"/$bunfs/root/chunk-t6pwageh.js";import{du}from"/$bunfs/root/chunk-krwpsn0e.js";import{o,A,u}from"/$bunfs/root/chunk-dk5kbfrn.js";var l=f(()=>A(u({marketplace:o(),plugin:o()})));function ukn(){let e=x("tengu_harbor_ledger",[]),n=l().safeParse(e);return n.success?n.data:[]}function W7(){return x("tengu_harbor",!1)}function Pbt(e){if(!e)return!1;let{name:n,marketplace:t}=du(e);if(!t)return!1;return ukn().some((r)=>r.plugin===n&&r.marketplace===t)}
export{ukn,W7,Pbt};
