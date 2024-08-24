import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as eks from "aws-cdk-lib/aws-eks";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import { KubectlV30Layer } from "@aws-cdk/lambda-layer-kubectl-v30";

export class CdkEksStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const clusterMasterRole = new iam.Role(this, "ClusterMasterRole-iam", {
      assumedBy: new iam.AccountRootPrincipal(),
    });

    const cluster = new eks.Cluster(this, "eks-cluster", {
      version: eks.KubernetesVersion.V1_30,
      kubectlLayer: new KubectlV30Layer(this, "kubectl"),
      defaultCapacityInstance: ec2.InstanceType.of(
        ec2.InstanceClass.T2,
        ec2.InstanceSize.MICRO
      ),
      mastersRole: clusterMasterRole,
    });

    clusterMasterRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["eks:AccessKubernetesApi", "eks:Describe*", "eks:List*"],
        resources: [cluster.clusterArn],
      })
    );

    // cluster.addManifest("mypod", {
    //   apiVersion: "v1",
    //   kind: "Pod",
    //   metadata: { name: "mypod" },
    //   spec: {
    //     containers: [
    //       {
    //         name: "hello",
    //         image: "paulbouwer/hello-kubernetes:1.5",
    //         ports: [{ containerPort: 8080 }],
    //       },
    //     ],
    //   },
    // });
  }
}
