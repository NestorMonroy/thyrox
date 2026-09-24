// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{S}from"/$bunfs/root/chunk-wfscmafr.js";import{et}from"/$bunfs/root/chunk-nqsdwfmt.js";var IA=1e6;import{createHash as k}from"crypto";function NAt(r){return r.configErrorReason==="url_empty"||!r.configError&&"url"in r&&r.url.trim()===""}function HG(r){let{scope:l,pluginSource:y,pluginPath:M,agentSource:s,declaredIn:C,configError:h,configErrorReason:E,expandedFromEnv:P,...f}=r,e=f;if(delete e.tools,delete e.discoveryCache,delete e.cachedInitResponse,delete e.cachedDiscoverResponse,delete e.discoverSupport,delete e.eligible,delete e.ineligibleReason,delete e.enterpriseManaged,e.type==="stdio"||e.type===void 0&&"command"in e)e.type="stdio",e.args=e.args??[];let d=typeof e.url==="string"&&URL.canParse(e.url)?/^([^?#]*\?)([^#]*)(.*)$/s.exec(e.url):null;if(d){let[,c="",o="",t=""]=d;e.url=c+o.split("&").sort((n,i)=>{let a=et(n,"="),u=et(i,"=");return a<u?-1:a>u?1:0}).join("&")+t}if(NAt(r))e.unconfigured=!0;if(s!==void 0)e.agentSource=s;let m=S(e,(c,o)=>{if(o&&typeof o==="object"&&!Array.isArray(o)){let t=o,n={};for(let i of Object.keys(t).sort())n[i]=t[i];return n}return o});return k("sha256").update(m).digest("hex").slice(0,16)}function br(r,l){return`${r}-${HG(l)}`}class p{loaderSide=null;register(r){this.loaderSide=r}}var g=new p;function Jco(r){g.register(r)}function l7t(){let r=g.loaderSide;if(!r)throw Error("MCP skill builders not registered \u2014 loadSkillsDir.ts has not been evaluated yet");return r}
export{IA,NAt,HG,br,Jco,l7t};
