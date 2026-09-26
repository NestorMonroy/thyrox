// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{a}from"/$bunfs/root/chunk-h56wjcte.js";import{Wr}from"/$bunfs/root/chunk-4xkhrz7w.js";import{_h,Yw}from"/$bunfs/root/chunk-sjwqnv88.js";import{il,x}from"/$bunfs/root/chunk-wbbthbh9.js";import{Oo}from"/$bunfs/root/chunk-j14wpeqn.js";var yCr={};Oo(yCr,{HOOKS_MODULES_ENV_SOURCE:()=>mCr,HOOKS_MODULES_FLAG:()=>Bit,HOOKS_MODULES_FLAG_SOURCE:()=>gCr,canLoadUserHooksModules:()=>fCr,default:()=>yCr,hooksModulesFlagDefault:()=>Yon,hooksModulesRolloutOn:()=>pke,hooksModulesRolloutSource:()=>hCr});var Bit="tengu_plugin_hooks_modules";var Yon=()=>!1;var pke=()=>a.CLAUDE_CODE_ENABLE_FUNCTION_HOOKS??x(Bit,Yon());var fCr=()=>pke()&&!Yw()&&!Wr("hooks")&&!_h();var mCr="overridden by the CLAUDE_CODE_ENABLE_FUNCTION_HOOKS environment variable";var gCr={override:"from a local override",payload:"from GrowthBook (this session's payload)",disk:"from GrowthBook (the disk cache of an earlier session)",disabled:"from the default (GrowthBook is off for this session: a third-party provider, or telemetry opted out)",fallback:"from the default (a cold GrowthBook cache, no payload yet)"};function hCr(){return a.CLAUDE_CODE_ENABLE_FUNCTION_HOOKS!==void 0?mCr:gCr[il(Bit,Yon()).source]}export{Bit,Yon,pke,fCr,mCr,gCr,hCr,yCr};
