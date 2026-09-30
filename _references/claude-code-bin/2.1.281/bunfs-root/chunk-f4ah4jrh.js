// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{a}from"/$bunfs/root/chunk-ay603yys.js";import{Gr}from"/$bunfs/root/chunk-bt5hqynf.js";import{nh,Uw}from"/$bunfs/root/chunk-tfep7b5e.js";import{Hl,x}from"/$bunfs/root/chunk-5khn4tvf.js";import{Ro}from"/$bunfs/root/chunk-0dapr5gw.js";var iEr={};Ro(iEr,{HOOKS_MODULES_ENV_SOURCE:()=>rEr,HOOKS_MODULES_FLAG:()=>ost,HOOKS_MODULES_FLAG_SOURCE:()=>oEr,canLoadUserHooksModules:()=>nEr,default:()=>iEr,hooksModulesFlagDefault:()=>Vtn,hooksModulesRolloutOn:()=>qve,hooksModulesRolloutSource:()=>sEr});var ost="tengu_plugin_hooks_modules";var Vtn=()=>!1;var qve=()=>a.CLAUDE_CODE_ENABLE_FUNCTION_HOOKS??x(ost,Vtn());var nEr=()=>qve()&&!Uw()&&!Gr("hooks")&&!nh();var rEr="overridden by the CLAUDE_CODE_ENABLE_FUNCTION_HOOKS environment variable";var oEr={override:"from a local override",payload:"from GrowthBook (this session's payload)",disk:"from GrowthBook (the disk cache of an earlier session)",disabled:"from the default (GrowthBook is off for this session: a third-party provider, or telemetry opted out)",fallback:"from the default (a cold GrowthBook cache, no payload yet)"};function sEr(){return a.CLAUDE_CODE_ENABLE_FUNCTION_HOOKS!==void 0?rEr:oEr[Hl(ost,Vtn()).source]}export{ost,Vtn,qve,nEr,rEr,oEr,sEr,iEr};
