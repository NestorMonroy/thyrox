// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{pL,Bhe}from"/$bunfs/root/chunk-zwm3fybx.js";import{Cr}from"/$bunfs/root/chunk-37swe2q7.js";import{Wr}from"/$bunfs/root/chunk-4xkhrz7w.js";import{_h,_Cr,Yw,Fie}from"/$bunfs/root/chunk-sjwqnv88.js";import{L_}from"/$bunfs/root/chunk-5yk5cxet.js";function Wwe(e){if(Wr("hooks"))return[];let n=pL()?.[e]??[];if(Yw())return n.filter((o)=>!("pluginRoot"in o)&&!("deviceOwner"in o));let t=_h(),i=t&&!Cr()?L_():null,r=_Cr();return[...Fie()?.[e]??[],...t?[]:Bhe()?.[e]??[],...n.filter((o)=>!(t&&("pluginRoot"in o)&&!i?.has(o.pluginId))&&!(r&&("deviceOwner"in o)))]}function jyr(){return!Wr("hooks")&&!Yw()&&!Cr()}
export{Wwe,jyr};
