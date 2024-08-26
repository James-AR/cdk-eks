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

## How to Deploy

There is a Github workflow attached to pushing to `main` which will automatically kick off a deploy to an
AWS account specified. AWS access and secret keys will need to be added to the repository secrets in Github.

You could manually deploy by cloning the repository, making sure to have all the pre-requisites installed,
then going into the project directory and making sure to install the dependencies with `npm install`. Next
step would be to run a `cdk synth` to make sure everything is correctly set up, this should generate the
CloudFormation JSON templates under `cdk.out`. After verifying, a `cdk deploy` will kick off a deploy to the
AWS account.

Once the stacks are deployed, AWS CDK will output a command you will need to run which will look like:
`aws eks update-kubeconfig --name <Cluster Name> --region <AWS region> --role-arn <ARN of the role>`
This will update the Kubernetes configuration to point to is so that kubectl commands will work.

Last step would be to `kubectl apply -f ./cdk8s/dist` which kubectl will use to deploy the containers to the
cluster. From here, you should be able to run any kubectl commands to interact, run `kubectl get all` to retrieve
the LoadBalancer's external IP and paste into browser to view the web application.

### Architecture

This EKS construct creates an EKS cluster with a dedicated VPC along with Amazon managed node groups.
The managed node groups will automatically provision and register the EC2 instances that will provide
compute capacity to run the Kubernetes applications. These nodes also run using the latest EKS optimized
AMIs from Amazon, making it the recommended way to allocate cluster capacity.

The EKS cluster will automatically create a cluster security group that is designed to allow all traffic
from the control plane and managed node groups to flow freely between each other. The EC2 worker nodes are
placed in an auto scaling group that is managed by the user.

This stack also captures a ContainerInsights metric that is used to create a CloudWatch alarm:
`https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Best_Practice_Recommended_Alarms_AWS_Services.html#EKS-ContainerInsights`
I chose one of the recommended metrics to create an alarm from the docs above, the alarm will be triggered upon one of the EKS worker nodes
exceeding 70% over a sustained period of time. At which point, one might implement a response to either replace the worker node
with a greater CPU capacity or perhaps scale the nodes horizontally.

### Significant blockers I encountered.

I spent quite a bit of time investigating how to capture a CloudWatch metric for EKS when discovering that EKS does not
automatically send metrics to CloudWatch. Rather, ECS/EKS are supported by ContainerInsights metrics which require
additional steps of installing a CloudWatch agent on nodes as well as making sure the worker node group's role had the
necessary permissions by attaching the aws managed policy 'CloudWatchAgentServerPolicy'. I resolved by resorting to
adding the EKS Observability Add-on to the EKS cluster.

Using the wrong EC2 instance size. The EKS Observability Add-on requires available IPs on each node, but
the t2.small only comes with 2 available IPs which are utilized already by AWS. Had to inspect pod created by
the addon with `kubectl describe pod <podname>` in the amazon-cloudwatch namespace to discover a failedscheduling error
with 0/2 nodes available. Came to the conclusion I needed instances with more available IPs for the CloudWatch agent,
which is implicity installed by the Add-on, to create the daemon.
