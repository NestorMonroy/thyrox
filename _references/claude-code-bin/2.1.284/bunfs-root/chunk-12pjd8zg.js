// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import"/$bunfs/root/chunk-8zeg9165.js";import"/$bunfs/root/chunk-37s48y77.js";import"/$bunfs/root/chunk-d37h8mav.js";import"/$bunfs/root/chunk-0pd7kjzx.js";import"/$bunfs/root/chunk-czwr6846.js";import"/$bunfs/root/chunk-31aa9k3a.js";import"/$bunfs/root/chunk-bz96yhka.js";import"/$bunfs/root/chunk-zy97v06w.js";import"/$bunfs/root/chunk-320rdak1.js";import"/$bunfs/root/chunk-0j2vcydt.js";import"/$bunfs/root/chunk-yr0jgjsq.js";import"/$bunfs/root/chunk-6b6gfk00.js";import"/$bunfs/root/chunk-7jxsf4cd.js";import"/$bunfs/root/chunk-k6n2tyj0.js";import"/$bunfs/root/chunk-k40f9rxb.js";import"/$bunfs/root/chunk-6v8fhz43.js";import"/$bunfs/root/chunk-8whxj5sg.js";import"/$bunfs/root/chunk-gqk3xdpc.js";import"/$bunfs/root/chunk-qwx8d9cf.js";import{yi}from"/$bunfs/root/chunk-ttv57pbg.js";import"/$bunfs/root/chunk-3xxkkv4v.js";import"/$bunfs/root/chunk-3zz7efen.js";import"/$bunfs/root/chunk-drw7d2f5.js";import{Xr}from"/$bunfs/root/chunk-54c5eade.js";function c(t,o,a,d){let e=(i,r)=>typeof i==="string"&&typeof r==="string"&&i===a(r),s=e(t.saved_pages_dir,o)?`[A quickstart in this conversation saved reference pages of this type on disk in ${Xr([t.saved_pages_dir])}; its result lists them, so those are not attached here.]`:"";if(t.not_listed===!0)return s===""?"":`

${s}`;let n=s===""?"":` ${s}`;if(typeof t.saved_system==="string"&&e(t.saved_system_dir,t.saved_system))return`

[A quickstart in this conversation already listed the design systems and saved the files of ${yi(t.saved_system,"(unrecognized address)")} on disk \u2014 skip the instructions' step that lists them and reads that README; its result lists the saved files.]${n}`;return s===""?null:`${d}${n}`}export{c as afterQuickstartSavedLine};
