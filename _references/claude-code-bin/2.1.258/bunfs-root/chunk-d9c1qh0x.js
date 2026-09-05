// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{m}from"/$bunfs/root/chunk-ffgkv432.js";import{L}from"/$bunfs/root/chunk-8qt7d28b.js";import{Yt}from"/$bunfs/root/chunk-7yszx9hr.js";import{i,T,c}from"/$bunfs/root/chunk-3qwvcykp.js";var a=m(()=>T(c({marketplace:i(),plugin:i()})));function KMt(){let e=L("tengu_harbor_ledger",[]),n=a().safeParse(e);return n.success?n.data:[]}function lz(){return L("tengu_harbor",!1)}function oin(e){if(!e)return!1;let{name:n,marketplace:r}=Yt(e);if(!r)return!1;return KMt().some((t)=>t.plugin===n&&t.marketplace===r)}
export{KMt,lz,oin};
