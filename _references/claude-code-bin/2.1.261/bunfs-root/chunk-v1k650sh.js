// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{tx}from"/$bunfs/root/chunk-hyqdn9c0.js";import{m}from"/$bunfs/root/chunk-84mvm17e.js";import{sO}from"/$bunfs/root/chunk-zx09n0a3.js";import{w,c}from"/$bunfs/root/chunk-hc3tpgm9.js";var o=60000,r=1800000,t=2592000000,i=m(()=>c({recurringFrac:w().min(0).max(1),recurringCapMs:w().int().min(0).max(r),oneShotMaxMs:w().int().min(0).max(r),oneShotFloorMs:w().int().min(0).max(r),oneShotMinuteMod:w().int().min(1).max(60),recurringMaxAgeMs:w().int().min(0).max(t).default(sO.recurringMaxAgeMs),cacheLeadMs:w().int().min(0).max(60000).default(sO.cacheLeadMs)}).refine((n)=>n.oneShotFloorMs<=n.oneShotMaxMs));function fre(){let n=tx("tengu_kairos_cron_config",sO,o),e=i().safeParse(n);return e.success?e.data:sO}
export{fre};
