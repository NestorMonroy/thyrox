// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{f}from"/$bunfs/root/chunk-1y7zyxh8.js";import{x}from"/$bunfs/root/chunk-5khn4tvf.js";import{$d}from"/$bunfs/root/chunk-wrhs39mg.js";import{o,C,d}from"/$bunfs/root/chunk-r9b963ay.js";var l=f(()=>C(d({marketplace:o(),plugin:o()})));function dmn(){let e=x("tengu_harbor_ledger",[]),n=l().safeParse(e);return n.success?n.data:[]}function dX(){return x("tengu_harbor",!1)}function mft(e){if(!e)return!1;let{name:n,marketplace:t}=$d(e);if(!t)return!1;return dmn().some((r)=>r.plugin===n&&r.marketplace===t)}
export{dmn,dX,mft};
