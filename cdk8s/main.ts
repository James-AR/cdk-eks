import { Construct } from "constructs";
import { App, Chart, ChartProps } from "cdk8s";
import { IntOrString, KubeService, KubeDeployment } from "./imports/k8s";

export class MyChart extends Chart {
  constructor(scope: Construct, id: string, props: ChartProps = {}) {
    super(scope, id, props);

    // define resources here
    const label = { app: "sample" };

    new KubeService(this, "service", {
      spec: {
        type: "LoadBalancer",
        ports: [{ port: 80, targetPort: IntOrString.fromNumber(80) }],
        selector: label,
      },
    });

    new KubeDeployment(this, "deployment", {
      spec: {
        replicas: 2,
        selector: {
          matchLabels: label,
        },
        template: {
          metadata: { labels: label },
          spec: {
            containers: [
              {
                name: "sample",
                image: "public.ecr.aws/s9u7u6x1/sample_app_001:no-db",
                ports: [{ containerPort: 80 }],
              },
            ],
          },
        },
      },
    });
  }
}

const app = new App();
new MyChart(app, "cdk8s");
app.synth();
