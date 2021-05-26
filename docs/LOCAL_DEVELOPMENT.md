# Local Development

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
kubectl get secret $(kubectl get secret --namespace kubernetes-dashboard | grep kubernetes-dashboard-token | awk '{print $1}') --namespace kubernetes-dashboard --template={{.data.token}} | base64 -D | pbcopy
```

Open the dashboard - http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/

Paste in your token and you should be good to go!

## Usage

NOTE: The `envsubst` binary is required and can be installed in macOS by running:

```sh
brew install gettext
```