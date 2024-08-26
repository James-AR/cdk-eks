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
      minSize: 1,
      maxSize: 4,
    });

    cluster.defaultNodegroup?.role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("CloudWatchAgentServerPolicy")
    );

    new eks.CfnAddon(this, "CloudWatchObservabilityAddOn", {
      addonName: "amazon-cloudwatch-observability",
      clusterName: cluster.clusterName,
    });

    const clusterMetric = new cloudwatch.Metric({
      metricName: "node_cpu_utilization",
      namespace: "ContainerInsights",
    });

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
