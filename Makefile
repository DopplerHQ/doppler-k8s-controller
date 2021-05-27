build:
	docker image build -t dopplerhq/k8s-controller .

tail-controller:
	kubectl logs deployments/doppler-controller --namespace doppler-controller --follow
