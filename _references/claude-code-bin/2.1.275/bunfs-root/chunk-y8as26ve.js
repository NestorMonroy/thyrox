// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{$e}from"/$bunfs/root/chunk-aw1peprz.js";import{G,W}from"/$bunfs/root/chunk-4qqe0nh4.js";import{K}from"/$bunfs/root/chunk-88w6q1nn.js";var s=new Set(["hipaa"]);class r{latched=new Set;latchedTaints=[];taints=[];current=[];changed=$e();verdict=void 0;replaceTaints(t){this.current=K(t).sort();for(let n of t)if(s.has(n))this.latched.add(n);if(this.latched.size!==this.latchedTaints.length)this.latchedTaints=Array.from(this.latched).sort();let i=K([...this.latchedTaints,...t]).sort();if(i.length===this.taints.length&&i.every((n,o)=>n===this.taints[o]))return!1;return this.taints=i,this.changed.emit(this.taints),!0}registerVerdict(t){this.verdict=t}resetForTesting(){this.latched.clear(),this.latchedTaints=[],this.taints=[],this.current=[]}}var a=new G(()=>new r);function e(){return a.of(W().host)}function Ekn(t){return e().replaceTaints(t)}function Sf(t){return e().taints.includes(t)}function LN(){return e().taints}function Mye(){return e().current}function kkn(){return e().latchedTaints}function vBe(t){return e().changed.subscribe(t)}function J5r(){e().resetForTesting()}function Q5r(t){e().registerVerdict(t)}function VM(t){return e().verdict?.isPolicyAllowed(t)??!1}function Z5r(t){try{return e().verdict?.commandPolicyGateAllows(t)??!1}catch{return!1}}function p2(t){let i=e().verdict;if(!i)return"unregistered";return i.policyDenyKind(t)}function wle(t,i,n){return e().verdict?.policyDeniedReason(t,i,n)??null}function $wt(){return e().verdict?.complianceTaintsSettled()??!1}
export{Ekn,Sf,LN,Mye,kkn,vBe,J5r,Q5r,VM,Z5r,p2,wle,$wt};
