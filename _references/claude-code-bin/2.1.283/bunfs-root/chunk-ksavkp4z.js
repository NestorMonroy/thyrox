// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{t}from"/$bunfs/root/chunk-zkn0228z.js";import{gD,sw,ese}from"/$bunfs/root/chunk-wczr02c0.js";import{Tw}from"/$bunfs/root/chunk-a64vqm80.js";function PN(e){let o=sw(),s=!!e.isAutoModeAvailable&&o;if(!s)t(`[auto-mode] canCycleToAuto=false: ctx.isAutoModeAvailable=${e.isAutoModeAvailable} isAutoModeGateEnabled=${o} reason=${ese()}`);return s}function oSt(e){return!!e.isBypassPermissionsModeAvailable&&!Tw()}function sSt(e,o){switch(e.mode){case"default":return"acceptEdits";case"acceptEdits":return"plan";case"plan":if(oSt(e))return"bypassPermissions";if(PN(e))return"auto";return"default";case"bypassPermissions":if(PN(e))return"auto";return"default";case"dontAsk":return"default";default:return"default"}}function cor(e,o,s){let n=sSt(e,o);return{nextMode:n,context:gD(e.mode,n,e,s)}}
export{PN,oSt,sSt,cor};
