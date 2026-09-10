// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{S_c as F}from"/$bunfs/root/_784.js";import{i$c as w}from"/$bunfs/root/_794.js";import{vxd as h}from"/$bunfs/root/_837.js";var P=h(function(p){var t=w(),l=F();function d(e){try{let o=new Set(Array.from(e.match(/([A-Z_]){3,}/g)??[]));return o.delete("CONFIG"),o.delete("CONFIG_PREFIX_SEPARATOR"),o.delete("ENV"),[...o].join(", ")}catch(o){return e}}var u=(e,o)=>async()=>{try{let r=e(process.env,o);if(r===void 0)throw Error();return r}catch(r){throw new t.CredentialsProviderError(r.message||`Not found in ENV: ${d(e.toString())}`,{logger:o?.logger})}},C=(e,{preferredFile:o="config",...r}={})=>async()=>{let n=l.getProfileName(r),{configFile:i,credentialsFile:c}=await l.loadSharedConfigFiles(r),s=c[n]||{},g=i[n]||{},m=o==="config"?{...s,...g}:{...g,...s};try{let f=e(m,o==="config"?i:c);if(f===void 0)throw Error();return f}catch(a){throw new t.CredentialsProviderError(a.message||`Not found in config files w/ profile [${n}]: ${d(e.toString())}`,{logger:r.logger})}},y=(e)=>typeof e==="function",E=(e)=>y(e)?async()=>await e():t.fromStatic(e),N=({environmentVariableSelector:e,configFileSelector:o,default:r},n={})=>{let{signingName:i,logger:c}=n,s={signingName:i,logger:c};return t.memoize(t.chain(u(e,s),C(o,n),E(r)))};p.loadConfig=N});
export{P as R_c};
