// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{a}from"/$bunfs/root/chunk-v49zfq06.js";import{Br}from"/$bunfs/root/chunk-x2xvykc7.js";import{Hh,Ub}from"/$bunfs/root/chunk-8h22rhhd.js";import{aa,x}from"/$bunfs/root/chunk-t6pwageh.js";import{vo}from"/$bunfs/root/chunk-ghttqp33.js";var CMr={};vo(CMr,{HOOKS_MODULES_ENV_SOURCE:()=>kMr,HOOKS_MODULES_FLAG:()=>Lct,HOOKS_MODULES_FLAG_SOURCE:()=>TMr,canLoadUserHooksModules:()=>EMr,default:()=>CMr,hooksModulesFlagDefault:()=>Scn,hooksModulesRolloutOn:()=>Hle,hooksModulesRolloutSource:()=>AMr});var Lct="tengu_plugin_hooks_modules";var Scn=()=>!1;var Hle=()=>a.CLAUDE_CODE_ENABLE_FUNCTION_HOOKS??x(Lct,Scn());var EMr=()=>Hle()&&!Ub()&&!Br("hooks")&&!Hh();var kMr="overridden by the CLAUDE_CODE_ENABLE_FUNCTION_HOOKS environment variable";var TMr={override:"from a local override",payload:"from GrowthBook (this session's payload)",disk:"from GrowthBook (the disk cache of an earlier session)",disabled:"from the default (GrowthBook is off for this session: a third-party provider, or telemetry opted out)",fallback:"from the default (a cold GrowthBook cache, no payload yet)"};function AMr(){return a.CLAUDE_CODE_ENABLE_FUNCTION_HOOKS!==void 0?kMr:TMr[aa(Lct,Scn()).source]}export{Lct,Scn,Hle,EMr,kMr,TMr,AMr,CMr};
