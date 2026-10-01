// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{Le,ks}from"/$bunfs/root/chunk-dj0a6j9w.js";import{Qr}from"/$bunfs/root/chunk-qr34qg3p.js";var WHe=(n)=>Le(n)?!0:ks(n)?!1:void 0;var xMn=(n)=>n===!0||n==="true";function RAt(n){return`It takes a number${n.min!==void 0||n.max!==void 0?` between ${n.min??"-\u221E"} and ${n.max??"\u221E"}`:""}.`}function xAt(n,e){let r=n.trim(),t=Number(r);return r!==""&&Number.isFinite(t)&&(e.min===void 0||t>=e.min)&&(e.max===void 0||t<=e.max)?t:void 0}var IAt={};Qr(IAt,{booleanOfInput:()=>WHe,default:()=>IAt,isHeldTrue:()=>xMn,numberInputHint:()=>RAt,numberOfInput:()=>xAt});
export{WHe,xMn,RAt,xAt,IAt};
