// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{zU,PPe}from"/$bunfs/root/chunk-hbjpbz2q.js";import{wM}from"/$bunfs/root/chunk-j6mm9mhr.js";import{io,$N,zn,YK,vn}from"/$bunfs/root/chunk-v1zj6cf5.js";function sdo(a){let e=a.trim(),r=io(),t=$N(e);if(t!==null)return{slug:t,url:vn({slug:t,env:r})};let n=e.toLowerCase();if(zn.test(n))return{slug:n,url:vn({slug:n,env:r})};let o=YK(e);if(o===null)return{error:"Error: --watch-artifact expects an artifact id or a claude.ai artifact URL"};if(o.env!==r)return{error:`Error: --watch-artifact got a ${o.env} artifact URL, but this session is signed in to ${r}`};return{slug:o.slug,url:vn(o)}}var s=null;function ido(a){s=a}function ado(){let a=s;return s=null,a}function ldo(){return s}function VTt(a){let e=[];for(let r=0;r<a.length;r++){let t=a[r];if(t==="--watch-artifact"||t==="--watch-artifact-no-autoreact"){r++;continue}if(t.startsWith("--watch-artifact=")||t.startsWith("--watch-artifact-no-autoreact="))continue;e.push(t)}return e}function MOn(a,e){a=a.toLowerCase();let r=["--watch-artifact","--watch-artifact-no-autoreact"],t=zU(),n=[],o=!1;for(let i=0;i<t.length;i++){let c=t[i];if(r.some((u)=>c===u&&t[i+1]?.toLowerCase()===a||c.toLowerCase()===`${u}=${a}`)){if(c.indexOf("=")===-1)i++;o=!0;continue}n.push(c)}if(o)PPe(n),wM("--watch-artifact",["--watch-artifact-no-autoreact"],null,void 0,e)}function cdo(a){let e=zU(),r;for(let t=0;t<e.length;t++){let n=e[t];if(n==="--watch-artifact"&&e[t+1]!==void 0)r=e[t+1].toLowerCase();else if(n.startsWith("--watch-artifact="))r=n.slice(17).toLowerCase()}if(r===void 0)return!1;return PPe([...VTt(zU()),"--watch-artifact-no-autoreact",r]),wM("--watch-artifact-no-autoreact",["--watch-artifact"],r,void 0,a),!0}
export{sdo,ido,ado,ldo,VTt,MOn,cdo};
