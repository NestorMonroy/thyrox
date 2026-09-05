// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{ux}from"/$bunfs/root/chunk-8qt7d28b.js";import{m}from"/$bunfs/root/chunk-ffgkv432.js";import{HO}from"/$bunfs/root/chunk-ens8r62y.js";import{A,c}from"/$bunfs/root/chunk-3qwvcykp.js";var o=60000,r=1800000,t=2592000000,i=m(()=>c({recurringFrac:A().min(0).max(1),recurringCapMs:A().int().min(0).max(r),oneShotMaxMs:A().int().min(0).max(r),oneShotFloorMs:A().int().min(0).max(r),oneShotMinuteMod:A().int().min(1).max(60),recurringMaxAgeMs:A().int().min(0).max(t).default(HO.recurringMaxAgeMs),cacheLeadMs:A().int().min(0).max(60000).default(HO.cacheLeadMs)}).refine((n)=>n.oneShotFloorMs<=n.oneShotMaxMs));function ire(){let n=ux("tengu_kairos_cron_config",HO,o),e=i().safeParse(n);return e.success?e.data:HO}
export{ire};
