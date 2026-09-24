// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{S,t}from"/$bunfs/root/chunk-wfscmafr.js";import{f}from"/$bunfs/root/chunk-1y7zyxh8.js";import{o,C,d,dt,z}from"/$bunfs/root/chunk-r9b963ay.js";var c="ui://",u="ui/resourceUri",p=4096,_="mcp-app",g=1024,l="[!#$%&'*+.^_`|~0-9A-Za-z-]+",h=new RegExp(`^[ \\t]*(${l})/(${l})`),a=new RegExp(`[ \\t\\r\\n]*;[ \\t\\r\\n]*(?:(${l})=(?:(${l})|"((?:[^"\\\\]|\\\\.)*)")(?=[ \\t\\r\\n]*(?:;|$)))?`,"y"),A=f(()=>d({ui:dt({resourceUri:o().startsWith(c).optional(),visibility:C(z(["model","app"])).optional()}).refine((r)=>S(r).length<=p).optional().catch(void 0),[u]:o().startsWith(c).max(p).optional().catch(void 0)}));function R(r){let e=r?.ui;if(e===void 0||e===null)return!1;if(typeof e!=="object"||Array.isArray(e))return!0;let n=Object.hasOwn(e,"visibility")?Reflect.get(e,"visibility"):void 0;if(n===void 0||n===null)return!1;return!Array.isArray(n)||!n.includes("model")}function XXe({uri:r,mimeType:e}){if(r.slice(0,c.length).toLowerCase()===c)return!0;if(e===void 0||e.length>g)return!1;let n=h.exec(e);if(n?.[1]?.toLowerCase()!=="text"||n[2]?.toLowerCase()!=="html")return!1;a.lastIndex=n[0].length;for(let i=a.exec(e);i!==null;i=a.exec(e)){let[,s,M,E]=i,m=M??E?.replace(/\\(.)/g,"$1");if(s?.toLowerCase()==="profile"&&m?.toLowerCase()===_)return!0}return!1}function vqt(r,e,n){let i=R(r);if(i)t(`MCP server "${e}": tool "${n}" is kept from the model (its _meta.ui.visibility omits "model" or cannot be read); hosts still see it in mcp_status`);return i}function b1e(r){return r.filter((e)=>e.mcpInfo?.hiddenFromModel!==!0)}function Eqt(r){let e=A().safeParse(r??{});if(!e.success)return;let{ui:n,[u]:i}=e.data,s={...n!==void 0&&{ui:n},...i!==void 0&&{[u]:i}};return Object.keys(s).length>0?s:void 0}
export{XXe,vqt,b1e,Eqt};
