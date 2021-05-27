# Doppler Kubernetes Controller (experimental)

The Doppler Kubernetes controller automatically syncs secret changes from Doppler to Kubernetes secrets with the ability to reload deployments on secret change.

## Installation

Deploy the controller by running:

```bash
kubectl apply -f manifests/doppler-crd-controller.yml
```

## Step 1. Creating the DopplerSecret Resoure

The first step is to create a custom `DopplerSecret` resource that will be used by the controller to create a corresponding Kubernetes secret. The Kubernetes secret created contains a map of key value pairs.

Save the following to `doppler-secret.yml`:

```yaml
apiVersion: 'doppler.com/v1'
kind: DopplerSecret
metadata:
  name: doppler-secret
  namespace: default
spec:
  serviceToken: 'dp.st.dev.Ix5TqVXsdOHq4FByFQbMadT3rotEHVZQ7v04NSbWT1I' # Doppler Service Token for config to sync
  secretName: app-secret # Name of Kubernetes Secret controller will create
```

Create an example resource:

```sh
kubectl apply -f doppler-secret.yml
```

Check that the Kubenertes secret has been created by the controller:

```sh
kubectl describe secrets --selector=dopplerSecret=true
```

## Step 2. Configuring a Deployment

As the controller creates a Kuberentes secret containing your secrets from Doppler, simply use the value for `secretName` used in the `DopplerSecret` resource.

If you'd like to enable the auto-reload functionality, then just add a single annotation to your deployment. 

To test using the example `DopplerSecret` from above, save the following to `doppler-deployment.yml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: doppler-secret-test
  annotations:
    dopplersecrets.doppler.com/reload: 'true' # Add for auto-reloads
spec:
  replicas: 1
  selector:
    matchLabels:
      app: doppler-secret-test
  template:
    metadata:
      labels:
        app: doppler-secret-test
    spec:      
      containers:
        - name: doppler-secret-test
          image: alpine
          command: ['/bin/sh', '-c', 'printenv && sleep 3600'] # Test by printing env var names
          envFrom: # Only envFrom is currently supported for auto-reloads
            - secretRef:
                name: app-secret # Should match DopplerSecret.spec.secretName          
```

Create the deployment:

```sh
kubectl apply -f doppler-deployment.yml
```

Once the Deployment has completed, you can view the output of environment variables inside the example container by running:

```sh
kubectl logs -lapp=doppler-secret-test 
```

## Cleaning up example resources

To clean up the example resources, run:

```sh
kubectl delete deployments/doppler-secret-test
kubectl delete dopplersecrets.doppler.com/doppler-secret
kubectl delete secrets/app-secret
```

To remove the controller and associated resources, run:

```sh
kubectl delete -f manifests/doppler-crd-controller.yml
```
