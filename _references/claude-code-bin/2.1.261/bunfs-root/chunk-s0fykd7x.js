// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{Dm}from"/$bunfs/root/chunk-mdpjsvxe.js";import{lCt}from"/$bunfs/root/chunk-xfdyka34.js";import{tu}from"/$bunfs/root/chunk-h3jmzymx.js";import{Rhe}from"/$bunfs/root/chunk-s32vdp9x.js";import{IS}from"/$bunfs/root/chunk-gjecv0hw.js";import{Wd}from"/$bunfs/root/chunk-h0ebn321.js";import{fe}from"/$bunfs/root/chunk-934z9d80.js";var a=fe(IS());var c=tu(),d=Dm(),l=Wd(),u=IS(),S=Rhe();var g=(e)=>`AWS_BEARER_TOKEN_${e.replace(/[\s-]/g,"_").toUpperCase()}`;var r=g;var s=fe(Wd()),iCt=({logger:e,signingName:n}={})=>async()=>{if(e?.debug?.("@aws-sdk/token-providers - fromEnvSigningName"),!n)throw new s.TokenProviderError("Please pass 'signingName' to compute environment variable key",{logger:e});let t=r(n);if(!(t in process.env))throw new s.TokenProviderError(`Token not present in '${t}' environment variable`,{logger:e});let o={token:process.env[t]};return a.setTokenFeature(o,"BEARER_SERVICE_ENV_VARS","3"),o};var i=fe(Wd());var aCt=(e={})=>i.memoize(i.chain(lCt(e),async()=>{throw new i.TokenProviderError("Could not load token from any providers",!1)}),(n)=>n.expiration!==void 0&&n.expiration.getTime()-Date.now()<300000,(n)=>n.expiration!==void 0);
export{iCt,aCt};
