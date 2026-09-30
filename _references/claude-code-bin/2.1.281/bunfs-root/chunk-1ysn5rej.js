// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{$h}from"/$bunfs/root/chunk-bf67dp7j.js";import{knn}from"/$bunfs/root/chunk-xr6jzxg1.js";import{bMe}from"/$bunfs/root/chunk-zh6rmag7.js";import{hT}from"/$bunfs/root/chunk-jzsevehw.js";import{ef}from"/$bunfs/root/chunk-48wpmrj6.js";import{Up}from"/$bunfs/root/chunk-cg7sbvw4.js";import{Se}from"/$bunfs/root/chunk-0dapr5gw.js";var a=Se(hT());var c=Up(),d=$h(),l=ef(),u=hT(),S=bMe();var g=(e)=>`AWS_BEARER_TOKEN_${e.replace(/[\s-]/g,"_").toUpperCase()}`;var r=g;var s=Se(ef()),vnn=({logger:e,signingName:n}={})=>async()=>{if(e?.debug?.("@aws-sdk/token-providers - fromEnvSigningName"),!n)throw new s.TokenProviderError("Please pass 'signingName' to compute environment variable key",{logger:e});let t=r(n);if(!(t in process.env))throw new s.TokenProviderError(`Token not present in '${t}' environment variable`,{logger:e});let o={token:process.env[t]};return a.setTokenFeature(o,"BEARER_SERVICE_ENV_VARS","3"),o};var i=Se(ef());var Enn=(e={})=>i.memoize(i.chain(knn(e),async()=>{throw new i.TokenProviderError("Could not load token from any providers",!1)}),(n)=>n.expiration!==void 0&&n.expiration.getTime()-Date.now()<300000,(n)=>n.expiration!==void 0);
export{vnn,Enn};
