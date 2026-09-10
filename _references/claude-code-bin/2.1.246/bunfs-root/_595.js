// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{ZDc as z,nDc as u,oDc as p,tDc as m,uDc as g}from"/$bunfs/root/_699.js";import{eOc as f,lOc as w}from"/$bunfs/root/_713.js";import{xxd as U}from"/$bunfs/root/_837.js";function x(e){let t=e.match(P);if(!t)return e;let n=t[1].toLowerCase();if(n==="http")n="https";let r=t[2].toLowerCase().replace(/:(?:443|80)$/,"").replace(/\.(?=$|:\d+$)/,"");return`${n}://${r}${t[3]??""}`}function E(e,t,n){if(e.size===0)return null;let r=g(t),c=new Set([m(t),r,`${r}/`]);if(typeof n==="string")c.add(u(n).trim());for(let[o,a]of e){let s=o.indexOf(":");if(s<=0)continue;let d=o.slice(0,s).trim(),i=o.slice(s+1).trim();if(d!=="url"||i==="")continue;let l=p(i.replace(/\*$/,""));if(l?.slug===t.slug&&l.env===t.env)return a;let R=new Set([i,x(i)]);for(let A of R)for(let h of c)if(f(A,h))return a}return null}var P;var y=U(()=>{w();z();P=/^([A-Za-z][A-Za-z0-9+.-]*):\/\/([^/?#]*)(.*)$/});
export{x as BSb,E as CSb,y as DSb};
