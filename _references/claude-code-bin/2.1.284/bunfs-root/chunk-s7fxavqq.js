// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{Le,Vo}from"/$bunfs/root/chunk-37s48y77.js";import{ro}from"/$bunfs/root/chunk-2dxhgqgt.js";var gtt=(n)=>Le(n)?!0:Vo(n)?!1:void 0;var EIn=(n)=>n===!0||n==="true";function kIn(n){return`It takes a number${n.min!==void 0||n.max!==void 0?` between ${n.min??"-\u221E"} and ${n.max??"\u221E"}`:""}.`}function TIn(n,e){let r=n.trim(),t=Number(r);return r!==""&&Number.isFinite(t)&&(e.min===void 0||t>=e.min)&&(e.max===void 0||t<=e.max)?t:void 0}var htt={};ro(htt,{booleanOfInput:()=>gtt,default:()=>htt,isHeldTrue:()=>EIn,numberInputHint:()=>kIn,numberOfInput:()=>TIn});
export{gtt,EIn,kIn,TIn,htt};
