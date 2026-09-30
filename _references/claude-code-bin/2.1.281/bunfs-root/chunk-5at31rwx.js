// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{LD,Ige}from"/$bunfs/root/chunk-cqc88nqm.js";import{Ar}from"/$bunfs/root/chunk-8bp13hnn.js";import{Gr}from"/$bunfs/root/chunk-bt5hqynf.js";import{nh,aEr,Uw,jse}from"/$bunfs/root/chunk-tfep7b5e.js";import{v_}from"/$bunfs/root/chunk-gzz3t5wc.js";function wSe(e){if(Gr("hooks"))return[];let n=LD()?.[e]??[];if(Uw())return n.filter((o)=>!("pluginRoot"in o)&&!("deviceOwner"in o));let t=nh(),i=t&&!Ar()?v_():null,r=aEr();return[...jse()?.[e]??[],...t?[]:Ige()?.[e]??[],...n.filter((o)=>!(t&&("pluginRoot"in o)&&!i?.has(o.pluginId))&&!(r&&("deviceOwner"in o)))]}function Lpr(){return!Gr("hooks")&&!Uw()&&!Ar()}
export{wSe,Lpr};
