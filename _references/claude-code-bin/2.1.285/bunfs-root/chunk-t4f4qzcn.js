// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{a}from"/$bunfs/root/chunk-5054mktj.js";import{Hs}from"/$bunfs/root/chunk-f74xvn8g.js";import{Y6e,xNt,n6,q$e,hut}from"/$bunfs/root/chunk-yvw7xvkm.js";import{to}from"/$bunfs/root/chunk-675ch139.js";var ENr={};to(ENr,{HOOKS_MODULES_ENV_SOURCE:()=>SNr,HOOKS_MODULES_FLAG:()=>Y6e,HOOKS_MODULES_FLAG_SOURCE:()=>wNr,canLaunchLoadUserHooksModules:()=>q$e,canLoadUserHooksModules:()=>hut,default:()=>ENr,hooksModulesFlagDefault:()=>xNt,hooksModulesRolloutOn:()=>n6,hooksModulesRolloutSource:()=>vNr});var SNr="overridden by the CLAUDE_CODE_ENABLE_FUNCTION_HOOKS environment variable";var wNr={override:"from a local override",payload:"from GrowthBook (this session's payload)",disk:"from GrowthBook (the disk cache of an earlier session)",disabled:"from the default (GrowthBook is off for this session: a third-party provider, or telemetry opted out)",fallback:"from the default (a cold GrowthBook cache, no payload yet)"};function vNr(){return a.CLAUDE_CODE_ENABLE_FUNCTION_HOOKS!==void 0?SNr:wNr[Hs(Y6e,xNt()).source]}export{SNr,wNr,vNr,ENr};
