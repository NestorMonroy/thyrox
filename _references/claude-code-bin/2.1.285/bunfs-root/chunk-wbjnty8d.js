// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{xy}from"/$bunfs/root/chunk-0g8a1v1r.js";import{spn}from"/$bunfs/root/chunk-z98wbvnv.js";import{cFe}from"/$bunfs/root/chunk-j8209ahp.js";import{vA}from"/$bunfs/root/chunk-1zengj6v.js";import{of}from"/$bunfs/root/chunk-n22jpy7f.js";import{uf}from"/$bunfs/root/chunk-e2p4d1td.js";import{Se}from"/$bunfs/root/chunk-675ch139.js";var a=Se(vA());var c=uf(),d=xy(),l=of(),u=vA(),S=cFe();var g=(e)=>`AWS_BEARER_TOKEN_${e.replace(/[\s-]/g,"_").toUpperCase()}`;var r=g;var s=Se(of()),npn=({logger:e,signingName:n}={})=>async()=>{if(e?.debug?.("@aws-sdk/token-providers - fromEnvSigningName"),!n)throw new s.TokenProviderError("Please pass 'signingName' to compute environment variable key",{logger:e});let t=r(n);if(!(t in process.env))throw new s.TokenProviderError(`Token not present in '${t}' environment variable`,{logger:e});let o={token:process.env[t]};return a.setTokenFeature(o,"BEARER_SERVICE_ENV_VARS","3"),o};var i=Se(of());var rpn=(e={})=>i.memoize(i.chain(spn(e),async()=>{throw new i.TokenProviderError("Could not load token from any providers",!1)}),(n)=>n.expiration!==void 0&&n.expiration.getTime()-Date.now()<300000,(n)=>n.expiration!==void 0);
export{npn,rpn};
