// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{ra}from"/$bunfs/root/chunk-qk0x1tcm.js";import{lkt}from"/$bunfs/root/chunk-bsxf6fm5.js";import{Nl}from"/$bunfs/root/chunk-8p7g3f8s.js";import{Fge}from"/$bunfs/root/chunk-2281krt3.js";import{fy}from"/$bunfs/root/chunk-dpz5ws5q.js";import{eu}from"/$bunfs/root/chunk-xz2p6d4y.js";import{z}from"/$bunfs/root/chunk-6zavqkd2.js";var a=z(fy(),1);var c=Nl(),d=ra(),l=eu(),u=fy(),S=Fge();var g=(e)=>`AWS_BEARER_TOKEN_${e.replace(/[\s-]/g,"_").toUpperCase()}`;var r=g;var s=z(eu(),1),nkt=({logger:e,signingName:n}={})=>async()=>{if(e?.debug?.("@aws-sdk/token-providers - fromEnvSigningName"),!n)throw new s.TokenProviderError("Please pass 'signingName' to compute environment variable key",{logger:e});let t=r(n);if(!(t in process.env))throw new s.TokenProviderError(`Token not present in '${t}' environment variable`,{logger:e});let o={token:process.env[t]};return a.setTokenFeature(o,"BEARER_SERVICE_ENV_VARS","3"),o};var i=z(eu(),1);var rkt=(e={})=>i.memoize(i.chain(lkt(e),async()=>{throw new i.TokenProviderError("Could not load token from any providers",!1)}),(n)=>n.expiration!==void 0&&n.expiration.getTime()-Date.now()<300000,(n)=>n.expiration!==void 0);
export{nkt,rkt};
