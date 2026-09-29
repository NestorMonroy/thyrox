// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{wre,_j}from"/$bunfs/root/chunk-e1ahn80a.js";import{xA}from"/$bunfs/root/chunk-r03mjfax.js";import{ppn}from"/$bunfs/root/chunk-hq9mtezn.js";import{TVn,ice}from"/$bunfs/root/chunk-ydh20bsp.js";import{LCn,IZe,OZe,$Cn,FCn,UCn,BCn,jCn}from"/$bunfs/root/chunk-rqy0h4n8.js";import{join as i,resolve as f}from"path";function yar(o,{backstop:t=!1}={}){return o.allowRules.sources.length>0||o.additionalDirectories.sources.length>0||!t&&(o.hookSources.length>0||o.commandHelperSources.length>0)}function _ar(){return{allowRules:IZe(),additionalDirectories:OZe(),hookSources:[],commandHelperSources:[]}}function w5t(o){let t=f(o),m=_j(t,xA),r=wre(i(t,".claude","settings.json")).settings,c=i(m,".claude","settings.local.json"),a=i(t,".claude","settings.local.json"),s=[wre(c).settings,...a===c?[]:[wre(a).settings]].filter((e)=>e!==null),S=s.length===0?null:{permissions:{additionalDirectories:s.flatMap((e)=>e.permissions?.additionalDirectories??[])}},u={projectSettings:r,localSettings:S},p={sources:[["projectSettings",".claude/settings.json"],["localSettings",".claude/settings.local.json"]],read:(e)=>u[e]??null,rules:(e)=>e==="localSettings"?s.flatMap((h)=>TVn(h,e)):TVn(u[e]??null,e)},d=(e)=>FCn(e)||UCn(e)||BCn(e)||$Cn(e)||jCn(e),l=[],n=[];if(LCn(r))l.push(".claude/settings.json");if(s.some(LCn))l.push(".claude/settings.local.json");let g=ppn(t);if(g!==null)l.push(ice(g));if(d(r))n.push(".claude/settings.json");if(s.some(d))n.push(".claude/settings.local.json");return{allowRules:IZe(p),additionalDirectories:OZe(p),hookSources:l,commandHelperSources:n}}
export{yar,_ar,w5t};
