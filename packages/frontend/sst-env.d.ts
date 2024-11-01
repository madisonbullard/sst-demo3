/* This file is auto-generated by SST. Do not edit. */
/* tslint:disable */
/* eslint-disable */
/* deno-fmt-ignore-file */
import "sst"
export {}
declare module "sst" {
  export interface Resource {
    "Api": {
      "name": string
      "type": "sst.aws.Function"
      "url": string
    }
    "ApiRouter": {
      "type": "sst.aws.Router"
      "url": string
    }
    "Auth": {
      "publicKey": string
      "type": "sst.aws.Auth"
    }
    "AuthAuthenticator": {
      "name": string
      "type": "sst.aws.Function"
      "url": string
    }
    "AuthRouter": {
      "type": "sst.aws.Router"
      "url": string
    }
    "DbProperties": {
      "connectionString": string
      "type": "sst.sst.Linkable"
    }
    "DevEmailAddress": {
      "type": "sst.sst.Secret"
      "value": string
    }
    "Email": {
      "configSet": string
      "sender": string
      "type": "sst.aws.Email"
    }
    "Frontend": {
      "type": "sst.aws.SvelteKit"
      "url": string
    }
  }
}
