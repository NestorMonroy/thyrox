// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{n}from"/$bunfs/root/chunk-y5pwxex8.js";import{vC,av,zX}from"/$bunfs/root/chunk-vd630rs0.js";import{Jy}from"/$bunfs/root/chunk-h7w3zg31.js";function N$(e){let o=av(),t=!!e.isAutoModeAvailable&&o;if(!t)n(`[auto-mode] canCycleToAuto=false: ctx.isAutoModeAvailable=${e.isAutoModeAvailable} isAutoModeGateEnabled=${o} reason=${zX()}`);return t}function YGe(e){return!!e.isBypassPermissionsModeAvailable&&!Jy()}function XGe(e,o){switch(e.mode){case"default":return"acceptEdits";case"acceptEdits":return"plan";case"plan":if(YGe(e))return"bypassPermissions";if(N$(e))return"auto";return"default";case"bypassPermissions":if(N$(e))return"auto";return"default";case"dontAsk":return"default";default:return"default"}}function LQt(e,o,t){let s=XGe(e,o);return{nextMode:s,context:vC(e.mode,s,e,t)}}
export{N$,YGe,XGe,LQt};
