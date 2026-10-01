// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import"/$bunfs/root/chunk-9wvhp90s.js";import"/$bunfs/root/chunk-dj0a6j9w.js";import"/$bunfs/root/chunk-hbjpbz2q.js";import"/$bunfs/root/chunk-616rkgbc.js";import"/$bunfs/root/chunk-dwaez71m.js";import"/$bunfs/root/chunk-ctczby4m.js";import"/$bunfs/root/chunk-bg5yf16b.js";import"/$bunfs/root/chunk-4dvekan0.js";import"/$bunfs/root/chunk-hqt9kt0y.js";import"/$bunfs/root/chunk-xz4v1m80.js";import"/$bunfs/root/chunk-8zh80t3g.js";import"/$bunfs/root/chunk-6w550002.js";import"/$bunfs/root/chunk-99bwgrc6.js";import"/$bunfs/root/chunk-xjjs8j5r.js";import"/$bunfs/root/chunk-pn8bw28z.js";import"/$bunfs/root/chunk-za1a5k6s.js";import"/$bunfs/root/chunk-v5r4yd9z.js";import"/$bunfs/root/chunk-av210xrn.js";import"/$bunfs/root/chunk-y6zh5p1t.js";import{fi}from"/$bunfs/root/chunk-v1zj6cf5.js";import"/$bunfs/root/chunk-vhdpagqc.js";import"/$bunfs/root/chunk-je15msha.js";import{Br}from"/$bunfs/root/chunk-63m0jy62.js";function c(t,o,a,d){let e=(i,r)=>typeof i==="string"&&typeof r==="string"&&i===a(r),s=e(t.saved_pages_dir,o)?`[A quickstart in this conversation saved reference pages of this type on disk in ${Br([t.saved_pages_dir])}; its result lists them, so those are not attached here.]`:"";if(t.not_listed===!0)return s===""?"":`

${s}`;let n=s===""?"":` ${s}`;if(typeof t.saved_system==="string"&&e(t.saved_system_dir,t.saved_system))return`

[A quickstart in this conversation already listed the design systems and saved the files of ${fi(t.saved_system,"(unrecognized address)")} on disk \u2014 skip the instructions' step that lists them and reads that README; its result lists the saved files.]${n}`;return s===""?null:`${d}${n}`}export{c as afterQuickstartSavedLine};
