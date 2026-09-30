// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{kre,pj}from"/$bunfs/root/chunk-srhvbygf.js";import{$A}from"/$bunfs/root/chunk-g6a51st9.js";import{wun}from"/$bunfs/root/chunk-h44wcpv1.js";import{VGn,ace}from"/$bunfs/root/chunk-w57cgxw3.js";import{LCn,MZe,DZe,$Cn,FCn,UCn,BCn,jCn}from"/$bunfs/root/chunk-pj2bjc7v.js";import{join as i,resolve as f}from"path";function har(o,{backstop:t=!1}={}){return o.allowRules.sources.length>0||o.additionalDirectories.sources.length>0||!t&&(o.hookSources.length>0||o.commandHelperSources.length>0)}function yar(){return{allowRules:MZe(),additionalDirectories:DZe(),hookSources:[],commandHelperSources:[]}}function l5t(o){let t=f(o),m=pj(t,$A),r=kre(i(t,".claude","settings.json")).settings,c=i(m,".claude","settings.local.json"),a=i(t,".claude","settings.local.json"),s=[kre(c).settings,...a===c?[]:[kre(a).settings]].filter((e)=>e!==null),S=s.length===0?null:{permissions:{additionalDirectories:s.flatMap((e)=>e.permissions?.additionalDirectories??[])}},u={projectSettings:r,localSettings:S},p={sources:[["projectSettings",".claude/settings.json"],["localSettings",".claude/settings.local.json"]],read:(e)=>u[e]??null,rules:(e)=>e==="localSettings"?s.flatMap((h)=>VGn(h,e)):VGn(u[e]??null,e)},d=(e)=>FCn(e)||UCn(e)||BCn(e)||$Cn(e)||jCn(e),l=[],n=[];if(LCn(r))l.push(".claude/settings.json");if(s.some(LCn))l.push(".claude/settings.local.json");let g=wun(t);if(g!==null)l.push(ace(g));if(d(r))n.push(".claude/settings.json");if(s.some(d))n.push(".claude/settings.local.json");return{allowRules:MZe(p),additionalDirectories:DZe(p),hookSources:l,commandHelperSources:n}}
export{har,yar,l5t};
