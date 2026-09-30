// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{CN}from"/$bunfs/root/chunk-5khn4tvf.js";import{f}from"/$bunfs/root/chunk-1y7zyxh8.js";import{LG}from"/$bunfs/root/chunk-xdfcyt9g.js";import{k,d}from"/$bunfs/root/chunk-r9b963ay.js";var o=60000,r=1800000,t=2592000000,i=f(()=>d({recurringFrac:k().min(0).max(1),recurringCapMs:k().int().min(0).max(r),oneShotMaxMs:k().int().min(0).max(r),oneShotFloorMs:k().int().min(0).max(r),oneShotMinuteMod:k().int().min(1).max(60),recurringMaxAgeMs:k().int().min(0).max(t).default(LG.recurringMaxAgeMs),cacheLeadMs:k().int().min(0).max(60000).default(LG.cacheLeadMs)}).refine((n)=>n.oneShotFloorMs<=n.oneShotMaxMs));function dhe(){let n=CN("tengu_kairos_cron_config",LG,o),e=i().safeParse(n);return e.success?e.data:LG}
export{dhe};
