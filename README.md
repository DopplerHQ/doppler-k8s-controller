# Doppler Kubernetes Controller

A custom Kubernetes Controller which polls Doppler's secrets API to automatically create and update a native Kubernetes secret using the `spec.serviceToken` and `spec.secretName` fields from the `dopplersecrets.doppler.com` custom resource.

The Kubernetes secret created by the controller is just a regular secret with some Doppler specific labels and annoations. 

The secret is then used by a deployment to expose the secrets as environment variables using `envFrom:`.

In essence, a `DopplerSecret` is just a mechanism to create a Kubernetes secret that is used by Deployments, saving the developer from habing to manually do that themselves.

## Installation

Apply the manifest in `manivests/crd.yml` by running:

```bash
kubectl apply -f ./k8s/manifest.yml
```

NOTE: The `crd.yml` defines an environment variables `SYNC_INTERVAL` which can be customized if required (default is once every 5 seconds). This is also the maximum delay between a `DopplerSecret` and the associated Kube secret being created.

## Kubernetes dashboard on Docker for Desktop for viewing resources

The Kubernetes dashboard is handy for inspecting the state of various resources such as the CRD itself and the logs of the Controller Pod so here is how you can access it if using Docker for Desktop:

Install the Dashboard resources:

```sh
kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/master/aio/deploy/recommended.yaml
```

Run Kube proxy in order to reach the dashboard:

```sh
kubectl proxy
```

Use `kubectl` to get the token value from the Kube secret that was created when the dashboard was installed and copy it to your clipboard:

```sh
kubectl get secret $(kubectl get secret --namespace kubernetes-dashboard | grep kubernetes-dashboard-token | awk '{print $1}') --namespace ${KUBE_DASHBOARD_NAMESPACE} --template={{.data.token}} | base64 -D | pbcopy
```

Open the dashboard - http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/

Paste in your token and you should be good to go!

## Usage

NOTE: The `envsubst` binary is required and can be installed in macOS by running:

```sh
brew install gettext
```

---

To create a `DopplerSecret`, run the following which will substitute the srevice token value and feed the stdout into the `kubectl`:

```sh
# Avoids hard-coding the service token in the manifest and it touching the file system
kubectl apply -f <(SERVICE_TOKEN="XXXXXX" envsubst < example/dopplersecret.yml)
```

Now create the deployment which uses the secret created by the Controller. The `secretName` in the `DopplerSecret` spec is the name of the sercret the controller will create, which will be referenced by the `envFrom.secretRef.name` property.

```sh
kubectl apply -f example/deployment.yml
```

Then in order to test that the deployment Pod had secrets supplied as env vars correctly, run the following which should be the names of all env vars:

```sh
kubectl logs -lapp=doppler-secret-test
```

### Clean up

To remove all resources create, run:

```sh
kubectl delete -f example/deployment.yml
kubectl delete -f example/dopplersecret.yml
kubectl delete secrets doppler-app-secret
```

## Learnings

- Revise deployment strategy. Need to have at least two nodes. Careful of single point of failure, then no secrets will be created.
- Automatically triggering a new deployment when variables is change is a cool idea, but not sure everyone will want that.
- What should happen if a service token is invalidated? Generally speaking, what's our approach to error handling.
- Probably best written in Go
- Max delay of `SYNC_INTERVAL` between `DopplerSecret` created and Kube secret created is the max delay that a deployment will be invalid if deployment is created when `DopplerSecret` is.

## To Do

- Tests!
- Handle case when invalid service token is supplied initially, as secret will not be created
- Use labels and selectors to have a `DopplerSecret` as the owner of the Kube secret
- Add a grace period and a finalizer to `DopplerSecret` so the controller can detect deleted state, remove associated secret, then remove finalizer to have Kube clean it up
