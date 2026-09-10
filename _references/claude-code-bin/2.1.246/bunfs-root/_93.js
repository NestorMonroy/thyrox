// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{Xwa as a,exa as d,fxa as l,oxa as f}from"/$bunfs/root/_441.js";import{wyb as r,xyb as c}from"/$bunfs/root/_549.js";import{jhd as i,ohd as m}from"/$bunfs/root/_820.js";import{xxd as u}from"/$bunfs/root/_837.js";function n(e){let o=d(),t=!!e.isAutoModeAvailable&&o;if(!t)i(`[auto-mode] canCycleToAuto=false: ctx.isAutoModeAvailable=${e.isAutoModeAvailable} isAutoModeGateEnabled=${o} reason=${l()}`);return t}function p(e){return!!e.isBypassPermissionsModeAvailable&&!r()}function M(e,o){switch(e.mode){case"default":return"acceptEdits";case"acceptEdits":return"plan";case"plan":if(p(e))return"bypassPermissions";if(n(e))return"auto";return"default";case"bypassPermissions":if(n(e))return"auto";return"default";case"dontAsk":return"default";default:return"default"}}function b(e,o,t){let s=M(e,o);return{nextMode:s,context:a(e.mode,s,e,t)}}var P=u(()=>{m();c();f()});
export{n as yj,M as zj,b as Aj,P as Bj};
