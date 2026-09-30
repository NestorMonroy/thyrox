// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{z,B}from"/$bunfs/root/chunk-t8q7n4ta.js";import{K}from"/$bunfs/root/chunk-xvw7zcsc.js";class n{directories=[];get(){return this.directories}publish(o){let t=K([...o.additionalWorkingDirectories.values()].map((e)=>e.path)).sort(),i=this.directories;if(i.length===t.length&&i.every((e,c)=>e===t[c]))return!1;return this.directories=t,!0}reset(){this.directories=[]}}var p=new z(()=>new n);function s(){return p.of(B().host)}function Pue(){return s().get()}function sNt(o){return s().publish(o)}var r=null;function KGn(o){let t=r;return r=o,t}function SX(){return r}
export{Pue,sNt,KGn,SX};
