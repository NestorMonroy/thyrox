// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{Ph}from"/$bunfs/root/chunk-6g304wh8.js";import{gVt}from"/$bunfs/root/chunk-y35d5n2e.js";import{mCe}from"/$bunfs/root/chunk-zrky0ws2.js";import{zE}from"/$bunfs/root/chunk-t0p48kkp.js";import{$f}from"/$bunfs/root/chunk-3fvzde5g.js";import{Gd}from"/$bunfs/root/chunk-mfr7w3xb.js";import{Se}from"/$bunfs/root/chunk-sr6jf0k1.js";var a=Se(zE());var c=Gd(),d=Ph(),l=$f(),u=zE(),S=mCe();var g=(e)=>`AWS_BEARER_TOKEN_${e.replace(/[\s-]/g,"_").toUpperCase()}`;var r=g;var s=Se($f()),fVt=({logger:e,signingName:n}={})=>async()=>{if(e?.debug?.("@aws-sdk/token-providers - fromEnvSigningName"),!n)throw new s.TokenProviderError("Please pass 'signingName' to compute environment variable key",{logger:e});let t=r(n);if(!(t in process.env))throw new s.TokenProviderError(`Token not present in '${t}' environment variable`,{logger:e});let o={token:process.env[t]};return a.setTokenFeature(o,"BEARER_SERVICE_ENV_VARS","3"),o};var i=Se($f());var mVt=(e={})=>i.memoize(i.chain(gVt(e),async()=>{throw new i.TokenProviderError("Could not load token from any providers",!1)}),(n)=>n.expiration!==void 0&&n.expiration.getTime()-Date.now()<300000,(n)=>n.expiration!==void 0);
export{fVt,mVt};
