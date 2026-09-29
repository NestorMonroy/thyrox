// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{Iy}from"/$bunfs/root/chunk-3gyk20a2.js";import{zpn}from"/$bunfs/root/chunk-6dx9axkv.js";import{EFe}from"/$bunfs/root/chunk-3b5e3nvw.js";import{hA}from"/$bunfs/root/chunk-45e9dw97.js";import{xf}from"/$bunfs/root/chunk-ak5ar9p1.js";import{yf}from"/$bunfs/root/chunk-bkr619pr.js";import{be}from"/$bunfs/root/chunk-2dxhgqgt.js";var a=be(hA());var c=yf(),d=Iy(),l=xf(),u=hA(),S=EFe();var g=(e)=>`AWS_BEARER_TOKEN_${e.replace(/[\s-]/g,"_").toUpperCase()}`;var r=g;var s=be(xf()),Wpn=({logger:e,signingName:n}={})=>async()=>{if(e?.debug?.("@aws-sdk/token-providers - fromEnvSigningName"),!n)throw new s.TokenProviderError("Please pass 'signingName' to compute environment variable key",{logger:e});let t=r(n);if(!(t in process.env))throw new s.TokenProviderError(`Token not present in '${t}' environment variable`,{logger:e});let o={token:process.env[t]};return a.setTokenFeature(o,"BEARER_SERVICE_ENV_VARS","3"),o};var i=be(xf());var Gpn=(e={})=>i.memoize(i.chain(zpn(e),async()=>{throw new i.TokenProviderError("Could not load token from any providers",!1)}),(n)=>n.expiration!==void 0&&n.expiration.getTime()-Date.now()<300000,(n)=>n.expiration!==void 0);
export{Wpn,Gpn};
