// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{t}from"/$bunfs/root/chunk-wfscmafr.js";import{z0,hS,Ene}from"/$bunfs/root/chunk-5npd9aj3.js";import{NS}from"/$bunfs/root/chunk-akdmzr4j.js";function XD(e){let o=hS(),s=!!e.isAutoModeAvailable&&o;if(!s)t(`[auto-mode] canCycleToAuto=false: ctx.isAutoModeAvailable=${e.isAutoModeAvailable} isAutoModeGateEnabled=${o} reason=${Ene()}`);return s}function ugt(e){return!!e.isBypassPermissionsModeAvailable&&!NS()}function pgt(e,o){switch(e.mode){case"default":return"acceptEdits";case"acceptEdits":return"plan";case"plan":if(ugt(e))return"bypassPermissions";if(XD(e))return"auto";return"default";case"bypassPermissions":if(XD(e))return"auto";return"default";case"dontAsk":return"default";default:return"default"}}function Z8n(e,o,s){let n=pgt(e,o);return{nextMode:n,context:z0(e.mode,n,e,s)}}
export{XD,ugt,pgt,Z8n};
