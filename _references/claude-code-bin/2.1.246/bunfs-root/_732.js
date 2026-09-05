// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{g$c as a}from"/$bunfs/root/_792.js";import{i$c as N}from"/$bunfs/root/_794.js";import{txd as _,xxd as S}from"/$bunfs/root/_837.js";var p,A,i="AWS_ACCESS_KEY_ID",I="AWS_SECRET_ACCESS_KEY",d="AWS_SESSION_TOKEN",v="AWS_CREDENTIAL_EXPIRATION",T="AWS_CREDENTIAL_SCOPE",l="AWS_ACCOUNT_ID",O=(e)=>async()=>{e?.logger?.debug("@aws-sdk/credential-provider-env - fromEnv");let o=process.env[i],r=process.env[I],n=process.env[d],s=process.env[v],t=process.env[T],E=process.env[l];if(o&&r){let c={accessKeyId:o,secretAccessKey:r,...n&&{sessionToken:n},...s&&{expiration:new Date(s)},...t&&{credentialScope:t},...E&&{accountId:E}};return p.setCredentialFeature(c,"CREDENTIALS_ENV_VARS","g"),c}throw new A.CredentialsProviderError("Unable to find environment variable credentials.",{logger:e?.logger})};var C=S(()=>{p=_(a(),1),A=_(N(),1)});var x=S(()=>{C()});
export{i as OTc,I as PTc,d as QTc,v as RTc,T as STc,l as TTc,O as UTc,x as VTc};
