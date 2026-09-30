// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{t}from"/$bunfs/root/chunk-fy3j7rz0.js";import{KR,OA,JJ}from"/$bunfs/root/chunk-yw4jc948.js";import{E_}from"/$bunfs/root/chunk-b0r59v4p.js";function jL(e){let o=OA(),s=!!e.isAutoModeAvailable&&o;if(!s)t(`[auto-mode] canCycleToAuto=false: ctx.isAutoModeAvailable=${e.isAutoModeAvailable} isAutoModeGateEnabled=${o} reason=${JJ()}`);return s}function pqe(e){return!!e.isBypassPermissionsModeAvailable&&!E_()}function fqe(e,o){switch(e.mode){case"default":return"acceptEdits";case"acceptEdits":return"plan";case"plan":if(pqe(e))return"bypassPermissions";if(jL(e))return"auto";return"default";case"bypassPermissions":if(jL(e))return"auto";return"default";case"dontAsk":return"default";default:return"default"}}function pnn(e,o,s){let n=fqe(e,o);return{nextMode:n,context:KR(e.mode,n,e,s)}}
export{jL,pqe,fqe,pnn};
