// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{t}from"/$bunfs/root/chunk-r2c9k9kh.js";import{rO,hA,e7}from"/$bunfs/root/chunk-5v3bq3ty.js";import{Wb}from"/$bunfs/root/chunk-sfvasbd0.js";function Q1(e){let o=hA(),s=!!e.isAutoModeAvailable&&o;if(!s)t(`[auto-mode] canCycleToAuto=false: ctx.isAutoModeAvailable=${e.isAutoModeAvailable} isAutoModeGateEnabled=${o} reason=${e7()}`);return s}function HZe(e){return!!e.isBypassPermissionsModeAvailable&&!Wb()}function OZe(e,o){switch(e.mode){case"default":return"acceptEdits";case"acceptEdits":return"plan";case"plan":if(HZe(e))return"bypassPermissions";if(Q1(e))return"auto";return"default";case"bypassPermissions":if(Q1(e))return"auto";return"default";case"dontAsk":return"default";default:return"default"}}function VCn(e,o,s){let n=OZe(e,o);return{nextMode:n,context:rO(e.mode,n,e,s)}}
export{Q1,HZe,OZe,VCn};
