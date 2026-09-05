// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
var l=new TextDecoder("utf-8",{ignoreBOM:!0});function d(n,r){let e=0,i=1;for(let u=0;u<10;u++){let a=r+u;if(a>=n.length)return;let t=n[a];if(e+=(t&127)*i,(t&128)===0)return{value:e,next:a+1};i*=128}return}function Tcn(n,r){let e=0;while(e<n.length){let i=d(n,e);if(i===void 0)return!1;let u=i.value&7,a=Math.floor(i.value/8);switch(e=i.next,u){case 0:{let t=d(n,e);if(t===void 0)return!1;e=t.next,r.onVarint?.(a,t.value);break}case 1:if(e+8>n.length)return!1;e+=8;break;case 2:{let t=d(n,e);if(t===void 0||t.value>n.length-t.next)return!1;e=t.next+t.value,r.onBytes?.(a,n.subarray(t.next,e));break}case 5:if(e+4>n.length)return!1;e+=4;break;default:return!1}}return!0}function fBt(n,r){let e;return Tcn(n,{onBytes(u,a){if(u===r)e=a}})?e:void 0}function OVn(n,r){let e=fBt(n,r);return e===void 0?void 0:l.decode(e)}
export{Tcn,fBt,OVn};
