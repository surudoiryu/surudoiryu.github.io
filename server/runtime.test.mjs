import assert from "node:assert/strict";import test from "node:test";import {validateRuntimeConfig} from "./runtime.mjs";
test("production fails closed on missing config",()=>assert.throws(()=>validateRuntimeConfig({NODE_ENV:"production"}),/Missing required/));
test("production rejects localhost GraphQL",()=>assert.throws(()=>validateRuntimeConfig({NODE_ENV:"production",FIREBASE_PROJECT_ID:"p",PUBLIC_SITE_ORIGIN:"https://weedinfo.nl",GRAPHQL_ENDPOINT:"http://localhost:4000/graphql"}),/localhost/));
test("valid production runtime passes",()=>assert.doesNotThrow(()=>validateRuntimeConfig({NODE_ENV:"production",FIREBASE_PROJECT_ID:"p",PUBLIC_SITE_ORIGIN:"https://weedinfo.nl"})));
