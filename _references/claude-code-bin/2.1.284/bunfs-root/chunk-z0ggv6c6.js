// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{$N,Ght,Xbe}from"/$bunfs/root/chunk-d37h8mav.js";import{xr}from"/$bunfs/root/chunk-0j2vcydt.js";import{jr}from"/$bunfs/root/chunk-ayxhgkx7.js";import{qh,MKn,MNr,eS,X3}from"/$bunfs/root/chunk-hq9mtezn.js";import{mb}from"/$bunfs/root/chunk-c6yk6epa.js";function Jke(e){if(jr("hooks"))return[];let n=$N()?.[e]??[];if(eS())return n.filter((o)=>!("pluginRoot"in o)&&!("deviceOwner"in o));let t=qh(),i=t&&!xr()?mb():null,r=MNr(),s=Ght();return[...X3()?.[e]??[],...t?[]:Xbe()?.[e]??[],...n.filter((o)=>l(o)&&s?.holds(o.pluginId)===!0?!(MKn()&&!i?.has(o.pluginId)):!(t&&("pluginRoot"in o)&&!i?.has(o.pluginId))&&!(r&&("deviceOwner"in o)))]}function l(e){return"pluginRoot"in e&&e.hooks.every((n)=>n.type==="command")}function tRr(){return!jr("hooks")&&!eS()&&!xr()}
export{Jke,tRr};
