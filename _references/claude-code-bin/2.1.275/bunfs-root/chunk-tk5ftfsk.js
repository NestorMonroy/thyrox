// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{a}from"/$bunfs/root/chunk-crr3rzxx.js";import{zr}from"/$bunfs/root/chunk-jmrhe0dv.js";import{tg,rS}from"/$bunfs/root/chunk-drvv5mre.js";import{zd,I}from"/$bunfs/root/chunk-xbd48fav.js";import{li}from"/$bunfs/root/chunk-sr6jf0k1.js";var xQn={};li(xQn,{HOOKS_MODULES_ENV_SOURCE:()=>TQn,HOOKS_MODULES_FLAG:()=>h1e,HOOKS_MODULES_FLAG_SOURCE:()=>CQn,canLoadBuiltinHooksModules:()=>QY,canLoadUserHooksModules:()=>AQn,default:()=>xQn,hooksModulesFlagDefault:()=>Nqt,hooksModulesRolloutOn:()=>y1e,hooksModulesRolloutSource:()=>RQn});var QY=()=>!rS()&&!zr("hooks")&&!tg();var h1e="tengu_plugin_hooks_modules";var Nqt=()=>!1;var y1e=()=>a.CLAUDE_CODE_ENABLE_FUNCTION_HOOKS??I(h1e,Nqt());var AQn=()=>y1e()&&QY();var TQn="overridden by the CLAUDE_CODE_ENABLE_FUNCTION_HOOKS environment variable";var CQn={override:"from a local override",payload:"from GrowthBook (this session's payload)",disk:"from GrowthBook (the disk cache of an earlier session)",disabled:"from the default (GrowthBook is off for this session: a third-party provider, or telemetry opted out)",fallback:"from the default (a cold GrowthBook cache, no payload yet)"};function RQn(){return a.CLAUDE_CODE_ENABLE_FUNCTION_HOOKS!==void 0?TQn:CQn[zd(h1e,Nqt()).source]}export{QY,h1e,Nqt,y1e,AQn,TQn,CQn,RQn,xQn};
