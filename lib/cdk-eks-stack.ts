import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as eks from "aws-cdk-lib/aws-eks";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import { KubectlV30Layer } from "@aws-cdk/lambda-layer-kubectl-v30";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";

export class CdkEksStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    /*
    You can map IAM users and roles to Kubernetes Role-based access control. Below I am creating a new role that
    allows the account root principal to assume and be able to interact with the control plane.
    */
    const clusterMasterRole = new iam.Role(this, "ClusterMasterRole-iam", {
      assumedBy: new iam.AccountRootPrincipal(),
    });

    /*
    I chose the instance type of t2.medium simply because it was adequate enough to install cloudwatch agent
    for ContainerInsights metrics and to keep costs low. Also setting a minimum node size of 2, with a maximum
    of 4 to allow autoscaling as needed.
    */
    const cluster = new eks.Cluster(this, "eks-cluster", {
      version: eks.KubernetesVersion.V1_30,
      kubectlLayer: new KubectlV30Layer(this, "kubectl"),
      defaultCapacityInstance: ec2.InstanceType.of(
        ec2.InstanceClass.T2,
        ec2.InstanceSize.MEDIUM
      ),
      mastersRole: clusterMasterRole,
      defaultCapacity: 0,
    });

    cluster.addNodegroupCapacity("custom-node-group", {
      instanceTypes: [new ec2.InstanceType("t2.medium")],
      minSize: 2,
      maxSize: 4,
    });

    /* 
    In order to activate ContainerInsights, a pre-requisite is to make sure the 
    role that the worker nodes inherit has this managed policy.
    */
    cluster.defaultNodegroup?.role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("CloudWatchAgentServerPolicy")
    );

    /*
    Adding the EKS Cloudwatch Observability Add-on to activate ContainerInsights
    */
    new eks.CfnAddon(this, "CloudWatchObservabilityAddOn", {
      addonName: "amazon-cloudwatch-observability",
      clusterName: cluster.clusterName,
    });

    /*
    Capturing the node cpu utilization metric here to be used in alarm
    */
    const clusterMetric = new cloudwatch.Metric({
      metricName: "node_cpu_utilization",
      namespace: "ContainerInsights",
    });

    /*
    Creating Cloudwatch alarm that will use the ContainerInsights metric
    'node_cpu_utilization'
    */
    new cloudwatch.Alarm(this, "clusterCpuAlarm", {
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      threshold: 70,
      metric: clusterMetric,
      evaluationPeriods: 5,
    });

    clusterMasterRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["eks:AccessKubernetesApi", "eks:Describe*", "eks:List*"],
        resources: [cluster.clusterArn],
      })
    );
  }
}
