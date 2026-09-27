// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{gN,F_e}from"/$bunfs/root/chunk-nvht7ckf.js";import{Tr}from"/$bunfs/root/chunk-4cnes656.js";import{Br}from"/$bunfs/root/chunk-x2xvykc7.js";import{Hh,RMr,Ub,y5}from"/$bunfs/root/chunk-8h22rhhd.js";import{eb}from"/$bunfs/root/chunk-aqjnefpv.js";function WEe(e){if(Br("hooks"))return[];let n=gN()?.[e]??[];if(Ub())return n.filter((o)=>!("pluginRoot"in o)&&!("deviceOwner"in o));let t=Hh(),i=t&&!Tr()?eb():null,r=RMr();return[...y5()?.[e]??[],...t?[]:F_e()?.[e]??[],...n.filter((o)=>!(t&&("pluginRoot"in o)&&!i?.has(o.pluginId))&&!(r&&("deviceOwner"in o)))]}function Hkr(){return!Br("hooks")&&!Ub()&&!Tr()}
export{WEe,Hkr};
