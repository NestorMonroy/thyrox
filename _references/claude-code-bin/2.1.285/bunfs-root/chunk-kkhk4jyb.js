// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{$F}from"/$bunfs/root/chunk-f74xvn8g.js";import{p}from"/$bunfs/root/chunk-z10rc4tf.js";import{aq}from"/$bunfs/root/chunk-w0abj3b2.js";import{T,d}from"/$bunfs/root/chunk-ea52y7e7.js";var o=60000,r=1800000,t=2592000000,i=p(()=>d({recurringFrac:T().min(0).max(1),recurringCapMs:T().int().min(0).max(r),oneShotMaxMs:T().int().min(0).max(r),oneShotFloorMs:T().int().min(0).max(r),oneShotMinuteMod:T().int().min(1).max(60),recurringMaxAgeMs:T().int().min(0).max(t).default(aq.recurringMaxAgeMs),cacheLeadMs:T().int().min(0).max(60000).default(aq.cacheLeadMs)}).refine((n)=>n.oneShotFloorMs<=n.oneShotMaxMs));function swe(){let n=$F("tengu_kairos_cron_config",aq,o),e=i().safeParse(n);return e.success?e.data:aq}
export{swe};
