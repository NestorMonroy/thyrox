// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{Csc as d,Esc as v}from"/$bunfs/root/_668.js";import{Ged as n,Oed as h}from"/$bunfs/root/_816.js";import{jhd as o,ohd as T}from"/$bunfs/root/_820.js";import{Jjd as i,Kjd as u,atd as M,zkd as m}from"/$bunfs/root/_826.js";import{wxd as l,xxd as c}from"/$bunfs/root/_837.js";var C={};l(C,{DEFAULT_TEAMMATE_MODE:()=>a,TeammateModeSnapshot:()=>r,captureTeammateModeSnapshot:()=>s,clearCliTeammateModeOverride:()=>g,getCliTeammateModeOverride:()=>S,getTeammateModeFromSnapshot:()=>x,hasTeammateModeSnapshot:()=>O,setCliTeammateModeOverride:()=>f,teammateModeSnapshots:()=>p});class r{captured=null;cliOverride=null;setCliOverride(e){this.cliOverride=e}capture(e){this.captured=e}replaceWith(e){this.captured=e,this.cliOverride=null}}function t(){return p.of(m().host)}function f(e){t().setCliOverride(e)}function S(){return t().cliOverride}function g(e){t().replaceWith(e),o(`[TeammateModeSnapshot] CLI override cleared, new mode: ${e}`)}function O(){return t().captured!==null}function s(){let e=t();if(e.cliOverride)e.capture(e.cliOverride),o(`[TeammateModeSnapshot] Captured from CLI override: ${e.captured}`);else e.capture(d("teammateMode",a).value),o(`[TeammateModeSnapshot] Captured from config: ${e.captured}`)}function x(){let e=t();if(e.captured===null)n(Error("getTeammateModeFromSnapshot called before capture - this indicates an initialization bug")),s();return e.captured??a}var a="in-process",p;var E=c(()=>{M();u();T();h();v();p=new i(()=>new r)});
export{a as e6b,r as f6b,p as g6b,f as h6b,S as i6b,g as j6b,O as k6b,s as l6b,x as m6b,C as n6b,E as o6b};
