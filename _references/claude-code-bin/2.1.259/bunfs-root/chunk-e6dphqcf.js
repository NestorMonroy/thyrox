// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{m}from"/$bunfs/root/chunk-55w4bsdv.js";import{L}from"/$bunfs/root/chunk-x722nt0q.js";import{Zt}from"/$bunfs/root/chunk-sm4f0pvs.js";import{i,T,c}from"/$bunfs/root/chunk-84vc68b7.js";var a=m(()=>T(c({marketplace:i(),plugin:i()})));function zNt(){let e=L("tengu_harbor_ledger",[]),n=a().safeParse(e);return n.success?n.data:[]}function Pz(){return L("tengu_harbor",!1)}function can(e){if(!e)return!1;let{name:n,marketplace:r}=Zt(e);if(!r)return!1;return zNt().some((t)=>t.plugin===n&&t.marketplace===r)}
export{zNt,Pz,can};
