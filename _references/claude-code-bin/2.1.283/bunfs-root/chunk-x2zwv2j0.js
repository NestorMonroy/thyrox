// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import"/$bunfs/root/chunk-s1pmhfks.js";import"/$bunfs/root/chunk-2j44ssk9.js";import"/$bunfs/root/chunk-nvht7ckf.js";import"/$bunfs/root/chunk-8nz62976.js";import"/$bunfs/root/chunk-vyyazxfq.js";import"/$bunfs/root/chunk-ern0s5ks.js";import"/$bunfs/root/chunk-jxwbd5gq.js";import"/$bunfs/root/chunk-yqm14hey.js";import"/$bunfs/root/chunk-fmsbxtrp.js";import"/$bunfs/root/chunk-4cnes656.js";import"/$bunfs/root/chunk-djetmnb8.js";import"/$bunfs/root/chunk-zkn0228z.js";import"/$bunfs/root/chunk-19wkka67.js";import"/$bunfs/root/chunk-vq0drrah.js";import"/$bunfs/root/chunk-bnk68ax9.js";import"/$bunfs/root/chunk-b1cxch1w.js";import"/$bunfs/root/chunk-v49zfq06.js";import"/$bunfs/root/chunk-4gwepcrh.js";import"/$bunfs/root/chunk-0yw1fewm.js";import{mi}from"/$bunfs/root/chunk-f31sk9qj.js";import"/$bunfs/root/chunk-pbnxt79v.js";import"/$bunfs/root/chunk-0grnxhq4.js";import"/$bunfs/root/chunk-f3bx5v1a.js";import{qr}from"/$bunfs/root/chunk-0qxzxz5e.js";function c(t,o,a,d){let e=(i,r)=>typeof i==="string"&&typeof r==="string"&&i===a(r),s=e(t.saved_pages_dir,o)?`[A quickstart in this conversation saved reference pages of this type on disk in ${qr([t.saved_pages_dir])}; its result lists them, so those are not attached here.]`:"";if(t.not_listed===!0)return s===""?"":`

${s}`;let n=s===""?"":` ${s}`;if(typeof t.saved_system==="string"&&e(t.saved_system_dir,t.saved_system))return`

[A quickstart in this conversation already listed the design systems and saved the files of ${mi(t.saved_system,"(unrecognized address)")} on disk \u2014 skip the instructions' step that lists them and reads that README; its result lists the saved files.]${n}`;return s===""?null:`${d}${n}`}export{c as afterQuickstartSavedLine};
