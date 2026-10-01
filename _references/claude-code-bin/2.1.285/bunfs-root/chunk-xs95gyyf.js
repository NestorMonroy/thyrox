// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{t}from"/$bunfs/root/chunk-055ns4k8.js";import{K0,vw,qse}from"/$bunfs/root/chunk-vnpkkncv.js";import{Vw}from"/$bunfs/root/chunk-6teg4we9.js";function a$(e){let o=vw(),s=!!e.isAutoModeAvailable&&o;if(!s)t(`[auto-mode] canCycleToAuto=false: ctx.isAutoModeAvailable=${e.isAutoModeAvailable} isAutoModeGateEnabled=${o} reason=${qse()}`);return s}function pvt(e){return!!e.isBypassPermissionsModeAvailable&&!Vw()}function fvt(e,o){switch(e.mode){case"default":return"acceptEdits";case"acceptEdits":return"plan";case"plan":if(pvt(e))return"bypassPermissions";if(a$(e))return"auto";return"default";case"bypassPermissions":if(a$(e))return"auto";return"default";case"dontAsk":return"default";default:return"default"}}function Kar(e,o,s){let n=fvt(e,o);return{nextMode:n,context:K0(e.mode,n,e,s)}}
export{a$,pvt,fvt,Kar};
