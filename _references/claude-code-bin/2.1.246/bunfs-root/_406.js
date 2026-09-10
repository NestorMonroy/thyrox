// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{sud as p,wud as a}from"/$bunfs/root/_830.js";import{xxd as s}from"/$bunfs/root/_837.js";function S(e,o,u="replace"){e((t)=>{let n=t.alwaysDenyRules.command,r=u==="union"?p([...n??[],...o]):[...o];if((n?.length??0)===r.length&&(n??[]).every((c,i)=>c===r[i]))return t;return{...t,alwaysDenyRules:{...t.alwaysDenyRules,command:r.length>0?r:void 0}}})}var l=s(()=>{a()});function x(e){return e.kind==="loop"?"loop_wakeup":"schedule_wakeup"}function P({promptSource:e,wakeupSource:o}){if(o)return o;switch(e){case"sdk":return"sdk";case"system":return"system";case"typed":case"queued":case"suggestion_accepted":return"user"}}function f({isNonInteractive:e,isMeta:o,callerSource:u}){if(e)return"sdk";if(o)return"system";return u??"typed"}var m=()=>{};
export{S as _Q,l as $Q,x as aR,P as bR,f as cR,m as dR};
