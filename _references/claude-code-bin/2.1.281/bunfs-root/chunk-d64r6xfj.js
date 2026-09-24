// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import"/$bunfs/root/chunk-kp7gknaw.js";import"/$bunfs/root/chunk-4a5nddj6.js";import"/$bunfs/root/chunk-cqc88nqm.js";import"/$bunfs/root/chunk-7yckkh1m.js";import"/$bunfs/root/chunk-rnxz8hs2.js";import"/$bunfs/root/chunk-2bj5eqbj.js";import"/$bunfs/root/chunk-7r0w3nmp.js";import"/$bunfs/root/chunk-35k7s716.js";import"/$bunfs/root/chunk-0n80jtth.js";import"/$bunfs/root/chunk-8bp13hnn.js";import"/$bunfs/root/chunk-dqhw8yqd.js";import"/$bunfs/root/chunk-wfscmafr.js";import"/$bunfs/root/chunk-kcjajdc8.js";import"/$bunfs/root/chunk-nqsdwfmt.js";import"/$bunfs/root/chunk-1y7zyxh8.js";import"/$bunfs/root/chunk-65nweewy.js";import"/$bunfs/root/chunk-ay603yys.js";import"/$bunfs/root/chunk-pwyp6fhc.js";import"/$bunfs/root/chunk-9c4ja01c.js";import{ri}from"/$bunfs/root/chunk-6j512bza.js";import"/$bunfs/root/chunk-5wq5hbjb.js";import"/$bunfs/root/chunk-hvxn56gd.js";import"/$bunfs/root/chunk-cft4wy8y.js";import{qr}from"/$bunfs/root/chunk-yg9a0wxc.js";function c(t,o,a,d){let e=(i,r)=>typeof i==="string"&&typeof r==="string"&&i===a(r),s=e(t.saved_pages_dir,o)?`[A quickstart in this conversation saved reference pages of this type on disk in ${qr([t.saved_pages_dir])}; its result lists them, so those are not attached here.]`:"";if(t.not_listed===!0)return s===""?"":`

${s}`;let n=s===""?"":` ${s}`;if(typeof t.saved_system==="string"&&e(t.saved_system_dir,t.saved_system))return`

[A quickstart in this conversation already listed the design systems and saved the files of ${ri(t.saved_system,"(unrecognized address)")} on disk \u2014 skip the instructions' step that lists them and reads that README; its result lists the saved files.]${n}`;return s===""?null:`${d}${n}`}export{c as afterQuickstartSavedLine};
