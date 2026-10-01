// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{a}from"/$bunfs/root/chunk-8whxj5sg.js";import{jr}from"/$bunfs/root/chunk-ayxhgkx7.js";import{qh,eS}from"/$bunfs/root/chunk-hq9mtezn.js";import{di,x}from"/$bunfs/root/chunk-swk3rjnt.js";import{ro}from"/$bunfs/root/chunk-2dxhgqgt.js";var HNr={};ro(HNr,{HOOKS_MODULES_ENV_SOURCE:()=>PNr,HOOKS_MODULES_FLAG:()=>Lut,HOOKS_MODULES_FLAG_SOURCE:()=>INr,canLoadUserHooksModules:()=>xNr,default:()=>HNr,hooksModulesFlagDefault:()=>upn,hooksModulesRolloutOn:()=>Tce,hooksModulesRolloutSource:()=>ONr});var Lut="tengu_plugin_hooks_modules";var upn=()=>!1;var Tce=()=>a.CLAUDE_CODE_ENABLE_FUNCTION_HOOKS??x(Lut,upn());var xNr=()=>Tce()&&!eS()&&!jr("hooks")&&!qh();var PNr="overridden by the CLAUDE_CODE_ENABLE_FUNCTION_HOOKS environment variable";var INr={override:"from a local override",payload:"from GrowthBook (this session's payload)",disk:"from GrowthBook (the disk cache of an earlier session)",disabled:"from the default (GrowthBook is off for this session: a third-party provider, or telemetry opted out)",fallback:"from the default (a cold GrowthBook cache, no payload yet)"};function ONr(){return a.CLAUDE_CODE_ENABLE_FUNCTION_HOOKS!==void 0?PNr:INr[di(Lut,upn()).source]}export{Lut,upn,Tce,xNr,PNr,INr,ONr,HNr};
