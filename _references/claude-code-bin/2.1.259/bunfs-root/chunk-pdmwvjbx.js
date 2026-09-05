// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{t}from"/$bunfs/root/chunk-fzpv8ev5.js";import{GC,Uv,vJ}from"/$bunfs/root/chunk-qpwbvc04.js";import{h_}from"/$bunfs/root/chunk-nzscmy2v.js";function oz(e){let o=Uv(),s=!!e.isAutoModeAvailable&&o;if(!s)t(`[auto-mode] canCycleToAuto=false: ctx.isAutoModeAvailable=${e.isAutoModeAvailable} isAutoModeGateEnabled=${o} reason=${vJ()}`);return s}function zZt(e){return!!e.isBypassPermissionsModeAvailable&&!h_()}function DWe(e,o){switch(e.mode){case"default":return"acceptEdits";case"acceptEdits":return"plan";case"plan":if(zZt(e))return"bypassPermissions";if(oz(e))return"auto";return"default";case"bypassPermissions":if(oz(e))return"auto";return"default";case"dontAsk":return"default";default:return"default"}}function VZt(e,o,s){let n=DWe(e,o);return{nextMode:n,context:GC(e.mode,n,e,s)}}
export{oz,zZt,DWe,VZt};
