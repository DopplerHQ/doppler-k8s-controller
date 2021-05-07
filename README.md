# Doppler Kubernetes Controller (experimental)

Want the benefits of populating individual environment variables in a Pod from a single secret with Doppler doing the heavy lifting? Welcome to our (experimental) Doppler Kubernetes Controller.

All you need to do is deploy the controller:

```bash
kubectl apply -f manifests/doppler-crd-controller.yml
```

Create a custom `DopplerSecret` resource:

```yaml
apiVersion: 'doppler.com/v1'
kind: DopplerSecret
metadata:
  name: my-app-secret
  namespace: default
spec:
  serviceToken: 'dp.st.XXXX' # Doppler Service Token
  secretName: doppler-app-secret # Name of Kubernetes Secret to create
```

Upon detecting a new `DopplerSecret`, the controller will automatically create a native Kubernetes secret that can be used by a deployment to expose the secrets as environment variables using the container `envFrom.secretRef.name` field:

```yaml
    containers:
    - name: doppler-secret-test
        image: alpine
        command: ['/bin/sh', '-c', 'printenv | sed "s;=.*;;" | sort && sleep 3600'] # Test by printing env var names
        imagePullPolicy: IfNotPresent
        envFrom:
        - secretRef:
            name: doppler-app-secret # Matches DopplerSecret spec.secretName
```

## Installation

Deploy the controller by running:

```bash
kubectl apply -f manifests/doppler-crd-controller.yml
```

> NOTE: The `doppler-crd-controller.yml` spec defines a `SYNC_INTERVAL` (5 seconds by default) environment variable which is the maximum delay between when a `DopplerSecret` and the corresponding Kubernetes secret will be created.

## Usage

You can quickly see the Controller in action by using the sample code in this repository.

> NOTE: The `envsubst` binary is shown below as a way of avoiding hard-coding the Doppler service token in the `DopplerSecret` spec. It can be installed in macOS by running `brew install gettext`

To create a `DopplerSecret`, first create a [Doppler Service Token](https://docs.doppler.com/docs/enclave-service-tokens) for a project in Doppler, then run the following to render the service token value into the spec sent to Kubernetes.

```sh
# Avoids hard-coding the service token in the manifest. Secrets should never be unencrypted at rest!
kubectl apply -f <(SERVICE_TOKEN="XXXXXX" envsubst < example/dopplersecret.yml)
```

Then create a test deployment:

```sh
kubectl apply -f example/deployment.yml
```

The `secretName` in the `DopplerSecret` is the name of the native secreted created by Doppler which should also be used as the value in the contianer's `envFrom.secretRef.name` field.

To test the Deployment succesfully received secrets from Doppler, view the container logs, which for testing purposes, displays a list of enviornment variables in the container.

```sh
kubectl logs -lapp=doppler-secret-test
```

### Clean up

To remove the secrets and deployment created from the above commands, run:

```sh
kubectl delete -f example/deployment.yml
kubectl delete -f example/dopplersecret.yml
kubectl delete secrets doppler-app-secret
```
