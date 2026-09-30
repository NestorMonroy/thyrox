// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{t}from"/$bunfs/root/chunk-6b6gfk00.js";import{ND,_w,Kse}from"/$bunfs/root/chunk-9qc605wz.js";import{Bw}from"/$bunfs/root/chunk-p8sa72qq.js";function n$(e){let o=_w(),s=!!e.isAutoModeAvailable&&o;if(!s)t(`[auto-mode] canCycleToAuto=false: ctx.isAutoModeAvailable=${e.isAutoModeAvailable} isAutoModeGateEnabled=${o} reason=${Kse()}`);return s}function cvt(e){return!!e.isBypassPermissionsModeAvailable&&!Bw()}function dvt(e,o){switch(e.mode){case"default":return"acceptEdits";case"acceptEdits":return"plan";case"plan":if(cvt(e))return"bypassPermissions";if(n$(e))return"auto";return"default";case"bypassPermissions":if(n$(e))return"auto";return"default";case"dontAsk":return"default";default:return"default"}}function Zar(e,o,s){let n=dvt(e,o);return{nextMode:n,context:ND(e.mode,n,e,s)}}
export{n$,cvt,dvt,Zar};
