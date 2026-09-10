// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
class E extends Error{constructor(o,i){super(o),this.name="ParseError",this.type=i.type,this.field=i.field,this.value=i.value,this.line=i.line}}var L=10,U=13,v=32;function O(o){}function d$t(o){if(typeof o=="function")throw TypeError("`callbacks` must be an object, got a function instead. Did you mean `{onEvent: fn}`?");let{onEvent:i=O,onError:C=O,onRetry:m=O,onComment:p}=o,s=[],g=!0,c,a="",f=0,l;function F(t){if(g&&(g=!1,t.charCodeAt(0)===239&&t.charCodeAt(1)===187&&t.charCodeAt(2)===191&&(t=t.slice(3))),s.length===0){let d=b(t);d!==""&&s.push(d);return}if(t.indexOf(`
`)===-1&&t.indexOf("\r")===-1){s.push(t);return}s.push(t);let e=s.join("");s.length=0;let r=b(e);r!==""&&s.push(r)}function b(t){let e=0;if(t.indexOf("\r")===-1){let r=t.indexOf(`
`,e);for(;r!==-1;){if(e===r){f>0&&i({id:c,event:l,data:a}),c=void 0,a="",f=0,l=void 0,e=r+1,r=t.indexOf(`
`,e);continue}let d=t.charCodeAt(e);if(P(t,e,d)){let n=t.charCodeAt(e+5)===v?e+6:e+5,A=t.slice(n,r);if(f===0&&t.charCodeAt(r+1)===L){i({id:c,event:l,data:A}),c=void 0,a="",l=void 0,e=r+2,r=t.indexOf(`
`,e);continue}a=f===0?A:`${a}
${A}`,f++}else S(t,e,d)?l=t.slice(t.charCodeAt(e+6)===v?e+7:e+6,r)||void 0:y(t,e,r);e=r+1,r=t.indexOf(`
`,e)}return t.slice(e)}for(;e<t.length;){let r=t.indexOf("\r",e),d=t.indexOf(`
`,e),n=-1;if(r!==-1&&d!==-1?n=r<d?r:d:r!==-1?r===t.length-1?n=-1:n=r:d!==-1&&(n=d),n===-1)break;y(t,e,n),e=n+1,t.charCodeAt(e-1)===U&&t.charCodeAt(e)===L&&e++}return t.slice(e)}function y(t,e,r){if(e===r){j();return}let d=t.charCodeAt(e);if(P(t,e,d)){let x=t.charCodeAt(e+5)===v?e+6:e+5,I=t.slice(x,r);a=f===0?I:`${a}
${I}`,f++;return}if(S(t,e,d)){l=t.slice(t.charCodeAt(e+6)===v?e+7:e+6,r)||void 0;return}if(d===105&&t.charCodeAt(e+1)===100&&t.charCodeAt(e+2)===58){let x=t.slice(t.charCodeAt(e+3)===v?e+4:e+3,r);c=x.includes("\x00")?void 0:x;return}if(d===58){if(p){let x=t.slice(e,r);p(x.slice(t.charCodeAt(e+1)===v?2:1))}return}let n=t.slice(e,r),A=n.indexOf(":");if(A===-1){w(n,"",n);return}let D=n.slice(0,A),R=n.charCodeAt(A+1)===v?2:1,q=n.slice(A+R);w(D,q,n)}function w(t,e,r){switch(t){case"event":l=e||void 0;break;case"data":a=f===0?e:`${a}
${e}`,f++;break;case"id":c=e.includes("\x00")?void 0:e;break;case"retry":/^\d+$/.test(e)?m(parseInt(e,10)):C(new E(`Invalid \`retry\` value: "${e}"`,{type:"invalid-retry",value:e,line:r}));break;default:C(new E(`Unknown field "${t.length>20?`${t.slice(0,20)}\u2026`:t}"`,{type:"unknown-field",field:t,value:e,line:r}));break}}function j(){f>0&&i({id:c,event:l,data:a}),c=void 0,a="",f=0,l=void 0}function T(t={}){if(t.consume&&s.length>0){let e=s.join("");y(e,0,e.length)}g=!0,c=void 0,a="",f=0,l=void 0,s.length=0}return{feed:F,reset:T}}function P(o,i,C){return C===100&&o.charCodeAt(i+1)===97&&o.charCodeAt(i+2)===116&&o.charCodeAt(i+3)===97&&o.charCodeAt(i+4)===58}function S(o,i,C){return C===101&&o.charCodeAt(i+1)===118&&o.charCodeAt(i+2)===101&&o.charCodeAt(i+3)===110&&o.charCodeAt(i+4)===116&&o.charCodeAt(i+5)===58}class Uze extends TransformStream{constructor({onError:o,onRetry:i,onComment:C}={}){let m;super({start(p){m=d$t({onEvent:(s)=>{p.enqueue(s)},onError(s){o==="terminate"?p.error(s):typeof o=="function"&&o(s)},onRetry:i,onComment:C})},transform(p){m.feed(p)}})}}
export{d$t,Uze};
