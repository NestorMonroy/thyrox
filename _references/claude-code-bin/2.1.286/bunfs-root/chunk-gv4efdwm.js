// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{roe,Bj}from"/$bunfs/root/chunk-v67w5hxq.js";import{tC}from"/$bunfs/root/chunk-j27hwf9z.js";import{tmn}from"/$bunfs/root/chunk-xfr8sb9t.js";import{YKn,Wce}from"/$bunfs/root/chunk-76ncyjb9.js";import{fIn,utt,ptt,gIn,hIn,yIn,_In,bIn}from"/$bunfs/root/chunk-1z1rckq0.js";import{join as i,resolve as f}from"path";function bdr(o,{backstop:t=!1}={}){return o.allowRules.sources.length>0||o.additionalDirectories.sources.length>0||!t&&(o.hookSources.length>0||o.commandHelperSources.length>0)}function Sdr(){return{allowRules:utt(),additionalDirectories:ptt(),hookSources:[],commandHelperSources:[]}}function T6t(o){let t=f(o),m=Bj(t,tC),r=roe(i(t,".claude","settings.json")).settings,c=i(m,".claude","settings.local.json"),a=i(t,".claude","settings.local.json"),s=[roe(c).settings,...a===c?[]:[roe(a).settings]].filter((e)=>e!==null),S=s.length===0?null:{permissions:{additionalDirectories:s.flatMap((e)=>e.permissions?.additionalDirectories??[])}},u={projectSettings:r,localSettings:S},p={sources:[["projectSettings",".claude/settings.json"],["localSettings",".claude/settings.local.json"]],read:(e)=>u[e]??null,rules:(e)=>e==="localSettings"?s.flatMap((h)=>YKn(h,e)):YKn(u[e]??null,e)},d=(e)=>hIn(e)||yIn(e)||_In(e)||gIn(e)||bIn(e),l=[],n=[];if(fIn(r))l.push(".claude/settings.json");if(s.some(fIn))l.push(".claude/settings.local.json");let g=tmn(t);if(g!==null)l.push(Wce(g));if(d(r))n.push(".claude/settings.json");if(s.some(d))n.push(".claude/settings.local.json");return{allowRules:utt(p),additionalDirectories:ptt(p),hookSources:l,commandHelperSources:n}}
export{bdr,Sdr,T6t};
