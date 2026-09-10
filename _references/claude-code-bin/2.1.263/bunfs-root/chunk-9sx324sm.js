// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{m}from"/$bunfs/root/chunk-78nzsrc6.js";import{I}from"/$bunfs/root/chunk-32f2qmtc.js";import{ng}from"/$bunfs/root/chunk-n3zbg2md.js";import{s,k,c}from"/$bunfs/root/chunk-9evvptjs.js";var l=m(()=>k(c({marketplace:s(),plugin:s()})));function nNt(){let e=I("tengu_harbor_ledger",[]),n=l().safeParse(e);return n.success?n.data:[]}function yW(){return I("tengu_harbor",!1)}function jsn(e){if(!e)return!1;let{name:n,marketplace:t}=ng(e);if(!t)return!1;return nNt().some((r)=>r.plugin===n&&r.marketplace===t)}
export{nNt,yW,jsn};
