# AWS CDK to create an EKS cluster

This project was done utilizing AWS CDK with Typescript.

Pre-requisites:

- Node.js
- AWS CLI
- AWS CDK Toolkit
- CDK8s
- kubectl

Main files to note:

- `/lib/cdk-eks-stack.ts` - defines the main CDK stack
- `/cdk8s/main.ts` defines the Kubernetes services and deployments , used to generate the file below
- `/cdk8s/dist/cdk8s.k8s.yaml` - Kubernetes config file which kubectl will use to deploy to containers

### Architecture

This EKS construct creates an EKS cluster with a dedicated VPC along with Amazon managed node groups.
The managed node groups will automatically provision and register the EC2 instances that will provide
compute capacity to run the Kubernetes applications. These nodes also run using the latest EKS optimized
AMIs from Amazon, making it the recommended way to allocate cluster capacity.

The EKS cluster will automatically create a cluster security group that is designed to allow all traffic
from the control plane and managed node groups to flow freely between each other. The EC2 worker nodes are
placed in an auto scaling group that is managed by the user.
