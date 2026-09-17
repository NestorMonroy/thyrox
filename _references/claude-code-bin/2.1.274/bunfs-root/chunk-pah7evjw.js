// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{a}from"/$bunfs/root/chunk-j96jysac.js";import{Br}from"/$bunfs/root/chunk-btbsqzbn.js";import{Wm,qb}from"/$bunfs/root/chunk-dq7a6ndq.js";import{Zd,I}from"/$bunfs/root/chunk-27bj2wbx.js";import{Zs}from"/$bunfs/root/chunk-3z5w4bh8.js";var xYn={};Zs(xYn,{HOOKS_MODULES_ENV_SOURCE:()=>TYn,HOOKS_MODULES_FLAG:()=>b8e,HOOKS_MODULES_FLAG_SOURCE:()=>CYn,canLoadUserHooksModules:()=>pY,default:()=>xYn,hooksModulesFlagDefault:()=>Ezt,hooksModulesRolloutOn:()=>T$e,hooksModulesRolloutSource:()=>RYn});var b8e="tengu_plugin_hooks_modules";var Ezt=()=>!1;var T$e=()=>a.CLAUDE_CODE_ENABLE_FUNCTION_HOOKS??I(b8e,Ezt());var pY=()=>T$e()&&!qb()&&!Br("hooks")&&!Wm();var TYn="overridden by the CLAUDE_CODE_ENABLE_FUNCTION_HOOKS environment variable";var CYn={override:"from a local override",payload:"from GrowthBook (this session's payload)",disk:"from GrowthBook (the disk cache of an earlier session)",disabled:"from the default (GrowthBook is off for this session: a third-party provider, or telemetry opted out)",fallback:"from the default (a cold GrowthBook cache, no payload yet)"};function RYn(){return a.CLAUDE_CODE_ENABLE_FUNCTION_HOOKS!==void 0?TYn:CYn[Zd(b8e,Ezt()).source]}export{b8e,Ezt,T$e,pY,TYn,CYn,RYn,xYn};
