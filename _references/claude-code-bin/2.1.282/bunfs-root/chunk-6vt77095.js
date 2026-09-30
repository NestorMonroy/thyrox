// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{oy}from"/$bunfs/root/chunk-wybdg2h0.js";import{xsn}from"/$bunfs/root/chunk-n6skt7v7.js";import{qDe}from"/$bunfs/root/chunk-e5v2f7w7.js";import{PT}from"/$bunfs/root/chunk-avd4r5ab.js";import{cf}from"/$bunfs/root/chunk-jq8vmc2k.js";import{Kp}from"/$bunfs/root/chunk-bbtbv3sj.js";import{Se}from"/$bunfs/root/chunk-j14wpeqn.js";var a=Se(PT());var c=Kp(),d=oy(),l=cf(),u=PT(),S=qDe();var g=(e)=>`AWS_BEARER_TOKEN_${e.replace(/[\s-]/g,"_").toUpperCase()}`;var r=g;var s=Se(cf()),Csn=({logger:e,signingName:n}={})=>async()=>{if(e?.debug?.("@aws-sdk/token-providers - fromEnvSigningName"),!n)throw new s.TokenProviderError("Please pass 'signingName' to compute environment variable key",{logger:e});let t=r(n);if(!(t in process.env))throw new s.TokenProviderError(`Token not present in '${t}' environment variable`,{logger:e});let o={token:process.env[t]};return a.setTokenFeature(o,"BEARER_SERVICE_ENV_VARS","3"),o};var i=Se(cf());var Rsn=(e={})=>i.memoize(i.chain(xsn(e),async()=>{throw new i.TokenProviderError("Could not load token from any providers",!1)}),(n)=>n.expiration!==void 0&&n.expiration.getTime()-Date.now()<300000,(n)=>n.expiration!==void 0);
export{Csn,Rsn};
