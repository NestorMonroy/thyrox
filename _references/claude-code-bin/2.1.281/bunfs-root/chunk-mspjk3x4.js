// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{ie,_9}from"/$bunfs/root/chunk-a22am1vw.js";var aPt=8,p=/(\t|\n)/,a=/[\x1b\x9b]/g;function FQ(o,i=aPt){if(!o.includes("\t"))return o;let l=_9(),c=l.feed(o);c.push(...l.flush());let e="",s=0;for(let t of c){let r;if(t.type==="text")r=t.value.replace(a,"\x18");else if(t.value.startsWith("\x1Bk"))r=t.value.replace(/\x9b/g,"\x18");else{e+=t.value;continue}for(let n of r.split(p))if(n==="\t"){let f=i-s%i;e+=" ".repeat(f),s+=f}else if(n===`
`)e+=n,s=0;else e+=n,s+=ie(n)}return e}
export{aPt,FQ};
