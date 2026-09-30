// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import"/$bunfs/root/chunk-b1a55n2g.js";import"/$bunfs/root/chunk-fkak21hw.js";import"/$bunfs/root/chunk-bxhyh54r.js";import"/$bunfs/root/chunk-k3gp1qmc.js";import"/$bunfs/root/chunk-aap6zsd0.js";import"/$bunfs/root/chunk-vqpmen5t.js";import"/$bunfs/root/chunk-dmpcy5p5.js";import"/$bunfs/root/chunk-actz3rxp.js";import"/$bunfs/root/chunk-hjabkkf1.js";import"/$bunfs/root/chunk-v34cw0y6.js";import"/$bunfs/root/chunk-vtytg7jt.js";import"/$bunfs/root/chunk-055ns4k8.js";import"/$bunfs/root/chunk-jsyn1gcs.js";import"/$bunfs/root/chunk-rg63yke9.js";import"/$bunfs/root/chunk-z10rc4tf.js";import"/$bunfs/root/chunk-qs4mqgaa.js";import"/$bunfs/root/chunk-5054mktj.js";import"/$bunfs/root/chunk-mbk7s6pb.js";import"/$bunfs/root/chunk-5zcypx67.js";import{Si}from"/$bunfs/root/chunk-dd2zynyc.js";import"/$bunfs/root/chunk-thv2q2wm.js";import"/$bunfs/root/chunk-8dcdden3.js";import"/$bunfs/root/chunk-gfn67bwy.js";import{Vr}from"/$bunfs/root/chunk-q6w20s82.js";function c(t,o,a,d){let e=(i,r)=>typeof i==="string"&&typeof r==="string"&&i===a(r),s=e(t.saved_pages_dir,o)?`[A quickstart in this conversation saved reference pages of this type on disk in ${Vr([t.saved_pages_dir])}; its result lists them, so those are not attached here.]`:"";if(t.not_listed===!0)return s===""?"":`

${s}`;let n=s===""?"":` ${s}`;if(typeof t.saved_system==="string"&&e(t.saved_system_dir,t.saved_system))return`

[A quickstart in this conversation already listed the design systems and saved the files of ${Si(t.saved_system,"(unrecognized address)")} on disk \u2014 skip the instructions' step that lists them and reads that README; its result lists the saved files.]${n}`;return s===""?null:`${d}${n}`}export{c as afterQuickstartSavedLine};
