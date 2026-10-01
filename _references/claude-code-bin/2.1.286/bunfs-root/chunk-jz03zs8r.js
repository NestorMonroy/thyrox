// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{Gy}from"/$bunfs/root/chunk-9gv7fkb4.js";import{Fmn}from"/$bunfs/root/chunk-96mr7wt7.js";import{CUe}from"/$bunfs/root/chunk-2f2mc9sg.js";import{NA}from"/$bunfs/root/chunk-fm9safr1.js";import{gf}from"/$bunfs/root/chunk-k740ascd.js";import{bf}from"/$bunfs/root/chunk-cbbn560v.js";import{be}from"/$bunfs/root/chunk-qr34qg3p.js";var a=be(NA());var c=bf(),d=Gy(),l=gf(),u=NA(),S=CUe();var g=(e)=>`AWS_BEARER_TOKEN_${e.replace(/[\s-]/g,"_").toUpperCase()}`;var r=g;var s=be(gf()),Lmn=({logger:e,signingName:n}={})=>async()=>{if(e?.debug?.("@aws-sdk/token-providers - fromEnvSigningName"),!n)throw new s.TokenProviderError("Please pass 'signingName' to compute environment variable key",{logger:e});let t=r(n);if(!(t in process.env))throw new s.TokenProviderError(`Token not present in '${t}' environment variable`,{logger:e});let o={token:process.env[t]};return a.setTokenFeature(o,"BEARER_SERVICE_ENV_VARS","3"),o};var i=be(gf());var Nmn=(e={})=>i.memoize(i.chain(Fmn(e),async()=>{throw new i.TokenProviderError("Could not load token from any providers",!1)}),(n)=>n.expiration!==void 0&&n.expiration.getTime()-Date.now()<300000,(n)=>n.expiration!==void 0);
export{Lmn,Nmn};
