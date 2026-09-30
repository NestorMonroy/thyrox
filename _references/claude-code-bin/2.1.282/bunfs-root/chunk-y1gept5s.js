// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{t}from"/$bunfs/root/chunk-nbcqw6vp.js";import{SM,xS,ure}from"/$bunfs/root/chunk-q3dfnatp.js";import{XS}from"/$bunfs/root/chunk-0q7yc4tx.js";function CL(e){let o=xS(),s=!!e.isAutoModeAvailable&&o;if(!s)t(`[auto-mode] canCycleToAuto=false: ctx.isAutoModeAvailable=${e.isAutoModeAvailable} isAutoModeGateEnabled=${o} reason=${ure()}`);return s}function oyt(e){return!!e.isBypassPermissionsModeAvailable&&!XS()}function syt(e,o){switch(e.mode){case"default":return"acceptEdits";case"acceptEdits":return"plan";case"plan":if(oyt(e))return"bypassPermissions";if(CL(e))return"auto";return"default";case"bypassPermissions":if(CL(e))return"auto";return"default";case"dontAsk":return"default";default:return"default"}}function nQn(e,o,s){let n=syt(e,o);return{nextMode:n,context:SM(e.mode,n,e,s)}}
export{CL,oyt,syt,nQn};
