// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{t}from"/$bunfs/root/chunk-6w550002.js";import{bL,Nw,M5}from"/$bunfs/root/chunk-n47xepyv.js";import{lv}from"/$bunfs/root/chunk-0yywvzwa.js";function M$(e){let o=Nw(),s=!!e.isAutoModeAvailable&&o;if(!s)t(`[auto-mode] canCycleToAuto=false: ctx.isAutoModeAvailable=${e.isAutoModeAvailable} isAutoModeGateEnabled=${o} reason=${M5()}`);return s}function ukt(e){return!!e.isBypassPermissionsModeAvailable&&!lv()}function pkt(e,o){switch(e.mode){case"default":return"acceptEdits";case"acceptEdits":return"plan";case"plan":if(ukt(e))return"bypassPermissions";if(M$(e))return"auto";return"default";case"bypassPermissions":if(M$(e))return"auto";return"default";case"dontAsk":return"default";default:return"default"}}function Jdr(e,o,s){let n=pkt(e,o);return{nextMode:n,context:bL(e.mode,n,e,s)}}
export{M$,ukt,pkt,Jdr};
