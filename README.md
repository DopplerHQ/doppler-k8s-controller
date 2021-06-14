| :information_source: This project has been replaced with the [Doppler Kubernetes Operator](https://github.com/DopplerHQ/kubernetes-operator).
| ---

# Doppler Kubernetes Controller (experimental)

Automatically sync secrets from Doppler to Kubernetes with auto-reload of Deployments when secrets change.

![Doppler Kubernetes Controller Diagram](https://user-images.githubusercontent.com/133014/119946348-e2465280-bfd9-11eb-8d72-34afebbb538c.png)

## Step 1. Deploying the Doppler Controller

Deploy the controller by running:

```bash
kubectl apply -f doppler-crd-controller.yml
kubectl rollout status -w deployment/doppler-controller --namespace doppler-controller
```

## Step 2. Creating a DopplerSecret

The first step is to create a custom `DopplerSecret` resource, consisting of a name and a Doppler Service Token.

Upon `DopplerSecret` creation, the controller creates an associated Kubernetes secret, populating it with the secrets fetched from the Doppler API in Key-Value format.

To follow along with an example, update the code below with a real Service Token and save as `doppler-secret.yml`:

```yaml
apiVersion: doppler.com/v1
kind: DopplerSecret 
metadata:
  name: dopplersecret-test # DopplerSecret resource name
spec:
  serviceToken: dp.st.dev.XXXX # Change to your Doppler Service Token
  secretName: doppler-test-secret # Kubernetes Secret name
```

Then create the `DopplerSecret`:

```sh
kubectl apply -f doppler-secret.yml
```

Check that the associated Kubernetes secret has been created:

```sh
# List all Kubernetes secrets created by the Doppler controller
kubectl describe secrets --selector=dopplerSecret=true

# Or to view secret values
./bin/get-secret.sh doppler-test-secret
```

The controller continuously watches for secret updates from Doppler and when detected, automatically and instantly updates the associated secret.

Next, we'll cover how to configure a deployment to use the Kubernetes secret and enable auto-reloading for Deployments.

## Step 3. Configuring a Deployment

To use the secret created by the Controller, we'll use the `envFrom` field to populate a container's environment variables using the secrets's Key-Value pairs:

```yaml
envFrom:
  - secretRef:
    name: mysecret # Matches the DopplerSecret name
```

Adding automatic and instant reloading of a deployment requires just a single annotation on the Deployment:

```yaml
annotations:
  dopplersecrets.doppler.com/reload: 'true'
```

Let's look at a complete example that uses previously created `DopplerSecret`. Save the below as `doppler-deployment.yml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: doppler-test-deployment
  annotations:
    dopplersecrets.doppler.com/reload: 'true'
spec:
  replicas: 2
  selector:
    matchLabels:
      app: doppler-test
  template:
    metadata:
      labels:
        app: doppler-test
    spec:      
      containers:
        - name: doppler-test
          image: alpine
          command: ['/bin/sh', '-c', 'apk add --no-cache tini > /dev/null 2>&1 && printenv | grep -v KUBERNETES_ && tini -s tail -f /dev/null'] # Test by printing env var names          
          imagePullPolicy: Always
          envFrom:
            - secretRef:
                name: doppler-test-secret # Should match DopplerSecret.spec.secretName
          resources:
            requests:
              memory: '250Mi'
              cpu: '250m'
            limits:
              memory: '500Mi'
              cpu: '500m'      
```

Create the deployment:

```sh
kubectl apply -f doppler-deployment.yml
kubectl rollout status -w deployment/doppler-test-deployment
```

Once the Deployment has completed, you can view the logs of the test container, which lists the environment variables (minus those with the `KUBERNETES_` prefix):

```sh
kubectl logs -lapp=doppler-test 
```

# Debugging and Troubleshooting

> NOTE: The `watch` binary is used by the below commands and can be installed on macOS using homebrew with `brew install watch`.

This repo contains a couple of handy scripts that give greater visibility into the secret and deployment updating process.

To watch a Doppler owned secret for updates:

```sh
# Replace `doppler-test-secret` with your secret name
./bin/get-secret.sh doppler-test-secret
```

To watch the logs of a running Pod:

```sh
# Replace `app=doppler-test` with your deployment label selector
watch ./bin/pod-logs.sh app=doppler-test
```
