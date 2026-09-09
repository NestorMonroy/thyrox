// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{BP}from"/$bunfs/root/chunk-btbsn9s4.js";import{m}from"/$bunfs/root/chunk-7tpgnqqk.js";import{fN}from"/$bunfs/root/chunk-34d5nn9z.js";import{E,c}from"/$bunfs/root/chunk-44xw78rx.js";var o=60000,r=1800000,t=2592000000,i=m(()=>c({recurringFrac:E().min(0).max(1),recurringCapMs:E().int().min(0).max(r),oneShotMaxMs:E().int().min(0).max(r),oneShotFloorMs:E().int().min(0).max(r),oneShotMinuteMod:E().int().min(1).max(60),recurringMaxAgeMs:E().int().min(0).max(t).default(fN.recurringMaxAgeMs),cacheLeadMs:E().int().min(0).max(60000).default(fN.cacheLeadMs)}).refine((n)=>n.oneShotFloorMs<=n.oneShotMaxMs));function $oe(){let n=BP("tengu_kairos_cron_config",fN,o),e=i().safeParse(n);return e.success?e.data:fN}
export{$oe};
