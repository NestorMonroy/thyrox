// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import"/$bunfs/root/chunk-q7rz8cer.js";import"/$bunfs/root/chunk-aw1peprz.js";import"/$bunfs/root/chunk-4qqe0nh4.js";import"/$bunfs/root/chunk-h401nbms.js";import"/$bunfs/root/chunk-d5d0zdsy.js";import"/$bunfs/root/chunk-gytndg57.js";import"/$bunfs/root/chunk-t2x4z9pb.js";import"/$bunfs/root/chunk-gfewy5rb.js";import"/$bunfs/root/chunk-gh1pqen9.js";import"/$bunfs/root/chunk-6ghkw3jc.js";import"/$bunfs/root/chunk-ebf04mp3.js";import"/$bunfs/root/chunk-4bbpt7sc.js";import"/$bunfs/root/chunk-q4s29khb.js";import"/$bunfs/root/chunk-dtjhjxgx.js";import"/$bunfs/root/chunk-j47jt515.js";import"/$bunfs/root/chunk-crr3rzxx.js";import"/$bunfs/root/chunk-y8as26ve.js";import"/$bunfs/root/chunk-w21br88b.js";import{$s}from"/$bunfs/root/chunk-cf542jqn.js";import"/$bunfs/root/chunk-75n2g1wh.js";import"/$bunfs/root/chunk-sdtzs6xq.js";import"/$bunfs/root/chunk-1b1s2j3n.js";import{uo}from"/$bunfs/root/chunk-sch9q889.js";function c(t,o,a,d){let e=(i,r)=>typeof i==="string"&&typeof r==="string"&&i===a(r),s=e(t.saved_pages_dir,o)?`[A quickstart in this conversation saved reference pages of this type on disk in ${uo([t.saved_pages_dir])}; its result lists them, so those are not attached here.]`:"";if(t.not_listed===!0)return s===""?"":`

${s}`;let n=s===""?"":` ${s}`;if(typeof t.saved_system==="string"&&e(t.saved_system_dir,t.saved_system))return`

[A quickstart in this conversation already listed the design systems and saved the files of ${$s(t.saved_system,"(unrecognized address)")} on disk \u2014 skip the instructions' step that lists them and reads that README; its result lists the saved files.]${n}`;return s===""?null:`${d}${n}`}export{c as afterQuickstartSavedLine};
