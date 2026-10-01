// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{a}from"/$bunfs/root/chunk-v5r4yd9z.js";import{Ss}from"/$bunfs/root/chunk-4hjp8tw4.js";import{u8e,FFt,C6,uUe,lft}from"/$bunfs/root/chunk-s78r4ksj.js";import{Qr}from"/$bunfs/root/chunk-qr34qg3p.js";var GUr={};Qr(GUr,{HOOKS_MODULES_ENV_SOURCE:()=>jUr,HOOKS_MODULES_FLAG:()=>u8e,HOOKS_MODULES_FLAG_DEFAULT:()=>FFt,HOOKS_MODULES_FLAG_SOURCE:()=>WUr,canLaunchLoadUserHooksModules:()=>uUe,canLoadUserHooksModules:()=>lft,default:()=>GUr,hooksModulesRolloutOn:()=>C6,hooksModulesRolloutSource:()=>zUr});var jUr="overridden by the CLAUDE_CODE_ENABLE_FUNCTION_HOOKS environment variable";var WUr={override:"from a local override",payload:"from GrowthBook (this session's payload)",disk:"from GrowthBook (the disk cache of an earlier session)",disabled:"from the default (GrowthBook is off for this session: a third-party provider, or telemetry opted out)",fallback:"from the default (a cold GrowthBook cache, no payload yet)"};function zUr(){return a.CLAUDE_CODE_ENABLE_FUNCTION_HOOKS!==void 0?jUr:WUr[Ss(u8e,FFt).source]}export{jUr,WUr,zUr,GUr};
