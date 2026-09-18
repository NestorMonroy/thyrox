// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{Ph}from"/$bunfs/root/chunk-0m70mbew.js";import{Gqt}from"/$bunfs/root/chunk-07svyjqq.js";import{Td}from"/$bunfs/root/chunk-a8zb1cc5.js";import{pCe}from"/$bunfs/root/chunk-aqngprg9.js";import{CE}from"/$bunfs/root/chunk-qz69s4vr.js";import{Mf}from"/$bunfs/root/chunk-nfk0j2xh.js";import{Se}from"/$bunfs/root/chunk-3z5w4bh8.js";var a=Se(CE());var c=Td(),d=Ph(),l=Mf(),u=CE(),S=pCe();var g=(e)=>`AWS_BEARER_TOKEN_${e.replace(/[\s-]/g,"_").toUpperCase()}`;var r=g;var s=Se(Mf()),Jzt=({logger:e,signingName:n}={})=>async()=>{if(e?.debug?.("@aws-sdk/token-providers - fromEnvSigningName"),!n)throw new s.TokenProviderError("Please pass 'signingName' to compute environment variable key",{logger:e});let t=r(n);if(!(t in process.env))throw new s.TokenProviderError(`Token not present in '${t}' environment variable`,{logger:e});let o={token:process.env[t]};return a.setTokenFeature(o,"BEARER_SERVICE_ENV_VARS","3"),o};var i=Se(Mf());var Qzt=(e={})=>i.memoize(i.chain(Gqt(e),async()=>{throw new i.TokenProviderError("Could not load token from any providers",!1)}),(n)=>n.expiration!==void 0&&n.expiration.getTime()-Date.now()<300000,(n)=>n.expiration!==void 0);
export{Jzt,Qzt};
