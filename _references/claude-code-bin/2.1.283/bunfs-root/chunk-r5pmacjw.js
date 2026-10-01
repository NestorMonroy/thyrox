// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{rF}from"/$bunfs/root/chunk-t6pwageh.js";import{f}from"/$bunfs/root/chunk-bnk68ax9.js";import{FV}from"/$bunfs/root/chunk-4089pf8f.js";import{k,u}from"/$bunfs/root/chunk-dk5kbfrn.js";var o=60000,r=1800000,t=2592000000,i=f(()=>u({recurringFrac:k().min(0).max(1),recurringCapMs:k().int().min(0).max(r),oneShotMaxMs:k().int().min(0).max(r),oneShotFloorMs:k().int().min(0).max(r),oneShotMinuteMod:k().int().min(1).max(60),recurringMaxAgeMs:k().int().min(0).max(t).default(FV.recurringMaxAgeMs),cacheLeadMs:k().int().min(0).max(60000).default(FV.cacheLeadMs)}).refine((n)=>n.oneShotFloorMs<=n.oneShotMaxMs));function Jbe(){let n=rF("tengu_kairos_cron_config",FV,o),e=i().safeParse(n);return e.success?e.data:FV}
export{Jbe};
