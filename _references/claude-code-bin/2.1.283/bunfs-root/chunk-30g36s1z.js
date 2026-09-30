// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{Sx}from"/$bunfs/root/chunk-peakek5v.js";var jf=Symbol("untrustedArray.unreadable"),yG="<unreadable list>";function Dk(e){let n;try{if(!Array.isArray(e))return;n=e.length}catch{return jf}if(typeof n!=="number"||!Number.isSafeInteger(n)||n<0||n>Sx)return jf;let u=[];for(let r=0;r<n;r++){let t;try{t=e[r]}catch{t=void 0}u.push(t)}return u}function qLe(e){let n=Dk(e);return n===jf?void 0:n}
export{jf,yG,Dk,qLe};
