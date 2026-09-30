// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{t}from"/$bunfs/root/chunk-4bbpt7sc.js";import{xO,Yw,N7}from"/$bunfs/root/chunk-jzb1vt5b.js";import{tS}from"/$bunfs/root/chunk-cek1ybdr.js";function DU(e){let o=Yw(),s=!!e.isAutoModeAvailable&&o;if(!s)t(`[auto-mode] canCycleToAuto=false: ctx.isAutoModeAvailable=${e.isAutoModeAvailable} isAutoModeGateEnabled=${o} reason=${N7()}`);return s}function Ptt(e){return!!e.isBypassPermissionsModeAvailable&&!tS()}function Htt(e,o){switch(e.mode){case"default":return"acceptEdits";case"acceptEdits":return"plan";case"plan":if(Ptt(e))return"bypassPermissions";if(DU(e))return"auto";return"default";case"bypassPermissions":if(DU(e))return"auto";return"default";case"dontAsk":return"default";default:return"default"}}function gHn(e,o,s){let n=Htt(e,o);return{nextMode:n,context:xO(e.mode,n,e,s)}}
export{DU,Ptt,Htt,gHn};
