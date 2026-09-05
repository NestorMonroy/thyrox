// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{t}from"/$bunfs/root/chunk-5nyank6v.js";import{RC,Cv,VX}from"/$bunfs/root/chunk-vw215j9f.js";import{s_}from"/$bunfs/root/chunk-ev951z8n.js";function PW(e){let o=Cv(),s=!!e.isAutoModeAvailable&&o;if(!s)t(`[auto-mode] canCycleToAuto=false: ctx.isAutoModeAvailable=${e.isAutoModeAvailable} isAutoModeGateEnabled=${o} reason=${VX()}`);return s}function k7t(e){return!!e.isBypassPermissionsModeAvailable&&!s_()}function Z2e(e,o){switch(e.mode){case"default":return"acceptEdits";case"acceptEdits":return"plan";case"plan":if(k7t(e))return"bypassPermissions";if(PW(e))return"auto";return"default";case"bypassPermissions":if(PW(e))return"auto";return"default";case"dontAsk":return"default";default:return"default"}}function T7t(e,o,s){let n=Z2e(e,o);return{nextMode:n,context:RC(e.mode,n,e,s)}}
export{PW,k7t,Z2e,T7t};
