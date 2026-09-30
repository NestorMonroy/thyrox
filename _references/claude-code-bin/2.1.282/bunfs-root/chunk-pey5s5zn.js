// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{WN}from"/$bunfs/root/chunk-wbbthbh9.js";import{f}from"/$bunfs/root/chunk-f344jh32.js";import{m2}from"/$bunfs/root/chunk-xjyqhe0t.js";import{k,d}from"/$bunfs/root/chunk-hq4c63ht.js";var o=60000,r=1800000,t=2592000000,i=f(()=>d({recurringFrac:k().min(0).max(1),recurringCapMs:k().int().min(0).max(r),oneShotMaxMs:k().int().min(0).max(r),oneShotFloorMs:k().int().min(0).max(r),oneShotMinuteMod:k().int().min(1).max(60),recurringMaxAgeMs:k().int().min(0).max(t).default(m2.recurringMaxAgeMs),cacheLeadMs:k().int().min(0).max(60000).default(m2.cacheLeadMs)}).refine((n)=>n.oneShotFloorMs<=n.oneShotMaxMs));function vye(){let n=WN("tengu_kairos_cron_config",m2,o),e=i().safeParse(n);return e.success?e.data:m2}
export{vye};
