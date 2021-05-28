#!/usr/bin/env bash

POD_NAME=$(kubectl get pods --field-selector=status.phase=Running -l $1 -o jsonpath={.items[0].metadata.name})
echo -e "\n### $POD_NAME ###\n"
kubectl logs $(kubectl get pods --field-selector=status.phase=Running -l $1 -o jsonpath={.items[0].metadata.name})
