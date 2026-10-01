// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{Le,bs}from"/$bunfs/root/chunk-fkak21hw.js";import{to}from"/$bunfs/root/chunk-675ch139.js";var LHe=(n)=>Le(n)?!0:bs(n)?!1:void 0;var KIn=(n)=>n===!0||n==="true";function xkt(n){return`It takes a number${n.min!==void 0||n.max!==void 0?` between ${n.min??"-\u221E"} and ${n.max??"\u221E"}`:""}.`}function Ikt(n,e){let r=n.trim(),t=Number(r);return r!==""&&Number.isFinite(t)&&(e.min===void 0||t>=e.min)&&(e.max===void 0||t<=e.max)?t:void 0}var Pkt={};to(Pkt,{booleanOfInput:()=>LHe,default:()=>Pkt,isHeldTrue:()=>KIn,numberInputHint:()=>xkt,numberOfInput:()=>Ikt});
export{LHe,KIn,xkt,Ikt,Pkt};
