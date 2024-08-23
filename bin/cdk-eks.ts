#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CdkEksStack } from '../lib/cdk-eks-stack';

const app = new cdk.App();
new CdkEksStack(app, 'CdkEksStack');
