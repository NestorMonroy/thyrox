// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import"/$bunfs/root/chunk-bjy6zt8z.js";import"/$bunfs/root/chunk-zt13kgz5.js";import"/$bunfs/root/chunk-zwm3fybx.js";import"/$bunfs/root/chunk-hm6k4hcw.js";import"/$bunfs/root/chunk-zxcb8vnv.js";import"/$bunfs/root/chunk-dw9y6h6j.js";import"/$bunfs/root/chunk-dbjks79r.js";import"/$bunfs/root/chunk-f8tyjwrg.js";import"/$bunfs/root/chunk-xt60grfb.js";import"/$bunfs/root/chunk-37swe2q7.js";import"/$bunfs/root/chunk-d6bkh9x7.js";import"/$bunfs/root/chunk-nbcqw6vp.js";import"/$bunfs/root/chunk-zx0c9jrs.js";import"/$bunfs/root/chunk-shebh248.js";import"/$bunfs/root/chunk-f344jh32.js";import"/$bunfs/root/chunk-se3pws52.js";import"/$bunfs/root/chunk-h56wjcte.js";import"/$bunfs/root/chunk-dezzmzg8.js";import"/$bunfs/root/chunk-9fz4qzzd.js";import{ai}from"/$bunfs/root/chunk-an11nt8y.js";import"/$bunfs/root/chunk-c01w1545.js";import"/$bunfs/root/chunk-bk43pm18.js";import"/$bunfs/root/chunk-2y2sj49d.js";import{Vr}from"/$bunfs/root/chunk-v6cpcj8d.js";function c(t,o,a,d){let e=(i,r)=>typeof i==="string"&&typeof r==="string"&&i===a(r),s=e(t.saved_pages_dir,o)?`[A quickstart in this conversation saved reference pages of this type on disk in ${Vr([t.saved_pages_dir])}; its result lists them, so those are not attached here.]`:"";if(t.not_listed===!0)return s===""?"":`

${s}`;let n=s===""?"":` ${s}`;if(typeof t.saved_system==="string"&&e(t.saved_system_dir,t.saved_system))return`

[A quickstart in this conversation already listed the design systems and saved the files of ${ai(t.saved_system,"(unrecognized address)")} on disk \u2014 skip the instructions' step that lists them and reads that README; its result lists the saved files.]${n}`;return s===""?null:`${d}${n}`}export{c as afterQuickstartSavedLine};
