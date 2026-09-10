// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{CA}from"/$bunfs/root/chunk-35hjj19b.js";import{Wd}from"/$bunfs/root/chunk-h0ebn321.js";import{H}from"/$bunfs/root/chunk-934z9d80.js";var tE=H(function(y){var t=Wd(),l=CA();function d(e){try{let o=new Set(Array.from(e.match(/([A-Z_]){3,}/g)??[]));return o.delete("CONFIG"),o.delete("CONFIG_PREFIX_SEPARATOR"),o.delete("ENV"),[...o].join(", ")}catch(o){return e}}var h=(e,o)=>async()=>{try{let r=e(process.env,o);if(r===void 0)throw Error();return r}catch(r){throw new t.CredentialsProviderError(r.message||`Not found in ENV: ${d(e.toString())}`,{logger:o?.logger})}},w=(e,{preferredFile:o="config",...r}={})=>async()=>{let n=l.getProfileName(r),{configFile:i,credentialsFile:c}=await l.loadSharedConfigFiles(r),s=c[n]||{},g=i[n]||{},m=o==="config"?{...s,...g}:{...g,...s};try{let f=e(m,o==="config"?i:c);if(f===void 0)throw Error();return f}catch(a){throw new t.CredentialsProviderError(a.message||`Not found in config files w/ profile [${n}]: ${d(e.toString())}`,{logger:r.logger})}},F=(e)=>typeof e==="function",u=(e)=>F(e)?async()=>await e():t.fromStatic(e),C=({environmentVariableSelector:e,configFileSelector:o,default:r},n={})=>{let{signingName:i,logger:c}=n,s={signingName:i,logger:c};return t.memoize(t.chain(h(e,s),w(o,n),u(r)))};y.loadConfig=C});
export{tE};
