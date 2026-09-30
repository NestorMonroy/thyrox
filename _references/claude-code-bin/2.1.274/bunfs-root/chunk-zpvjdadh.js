// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import"/$bunfs/root/chunk-4cmy5sqz.js";import"/$bunfs/root/chunk-tep8see7.js";import"/$bunfs/root/chunk-ja309z9r.js";import"/$bunfs/root/chunk-p7hrkaq4.js";import"/$bunfs/root/chunk-3btyksgt.js";import"/$bunfs/root/chunk-64dkx51v.js";import"/$bunfs/root/chunk-akpzg2yh.js";import"/$bunfs/root/chunk-g5h2a16k.js";import"/$bunfs/root/chunk-b565vq97.js";import"/$bunfs/root/chunk-53a5hn9r.js";import"/$bunfs/root/chunk-hxy982f9.js";import"/$bunfs/root/chunk-r2c9k9kh.js";import"/$bunfs/root/chunk-yy7a4xwv.js";import"/$bunfs/root/chunk-w8gsn0hm.js";import"/$bunfs/root/chunk-ecxh3hga.js";import"/$bunfs/root/chunk-j96jysac.js";import"/$bunfs/root/chunk-4jd7d9ec.js";import"/$bunfs/root/chunk-8jxxned0.js";import{Os}from"/$bunfs/root/chunk-x31r83nz.js";import"/$bunfs/root/chunk-qk2a968b.js";import"/$bunfs/root/chunk-71zbyxdf.js";import"/$bunfs/root/chunk-8nk4yw0p.js";import{yo}from"/$bunfs/root/chunk-r8n1bbva.js";function c(t,o,a,d){let e=(i,r)=>typeof i==="string"&&typeof r==="string"&&i===a(r),s=e(t.saved_pages_dir,o)?`[A quickstart in this conversation saved reference pages of this type on disk in ${yo([t.saved_pages_dir])}; its result lists them, so those are not attached here.]`:"";if(t.not_listed===!0)return s===""?"":`

${s}`;let n=s===""?"":` ${s}`;if(typeof t.saved_system==="string"&&e(t.saved_system_dir,t.saved_system))return`

[A quickstart in this conversation already listed the design systems and saved the files of ${Os(t.saved_system,"(unrecognized address)")} on disk \u2014 skip the instructions' step that lists them and reads that README; its result lists the saved files.]${n}`;return s===""?null:`${d}${n}`}export{c as afterQuickstartSavedLine};
