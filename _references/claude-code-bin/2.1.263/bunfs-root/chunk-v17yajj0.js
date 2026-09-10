// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{n}from"/$bunfs/root/chunk-mh9y4c2z.js";import{vC,av,qX}from"/$bunfs/root/chunk-9wa0ka8p.js";import{Jy}from"/$bunfs/root/chunk-mqe5za4p.js";function N$(e){let o=av(),t=!!e.isAutoModeAvailable&&o;if(!t)n(`[auto-mode] canCycleToAuto=false: ctx.isAutoModeAvailable=${e.isAutoModeAvailable} isAutoModeGateEnabled=${o} reason=${qX()}`);return t}function JGe(e){return!!e.isBypassPermissionsModeAvailable&&!Jy()}function QGe(e,o){switch(e.mode){case"default":return"acceptEdits";case"acceptEdits":return"plan";case"plan":if(JGe(e))return"bypassPermissions";if(N$(e))return"auto";return"default";case"bypassPermissions":if(N$(e))return"auto";return"default";case"dontAsk":return"default";default:return"default"}}function PQt(e,o,t){let s=QGe(e,o);return{nextMode:s,context:vC(e.mode,s,e,t)}}
export{N$,JGe,QGe,PQt};
