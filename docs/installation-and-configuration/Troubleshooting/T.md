# Troubleshooting

## Jupyter Error 1

Saving a file causes the following error:
    
`Creating file failed. An error occurred while creating a new file.`

`Unexpected error while saving file: input/home/filename [Errno 2]`

`No such file or directory: /mnt/input/home/filename`
        
The error appears when a user tries to save file in `/input/home` folder, which is a read-only folder. In Jupyter, select the `/output/home` folder to correct this issue.

## Jupyter Error 2
Closing the Jupyter notebook window in a Web browser causes experiments to stop executing. Attaching to the same Jupyter session still shows the stopped experiment.

**Note:** This is a known issue in Jupyter (refer to: [https://github.com/jupyter/notebook/issues/1647](https://github.com/jupyter/notebook/issues/1647) for more information). Currently, there _is no_ workaround.
   
## User Management Error (Users with the Same Name Cannot be Created) 

After deleting a user name and verifying that the user name _is not_ on the list of user names, it _is not_ possible to create a new user with the same name within short period of time. This is due to a user's-related Kubernetes objects, which are deleted asynchronously by Kubernetes and due to these deletions can take time.

**Note:** To resolve, wait a few minutes before creating a user with the same name.

## Docker Error 

The Docker installation on the client machine takes up significant  space and contains a large amount of container images.
In the Docker documentation it states:[https://docs.docker.com](https://docs.docker.com) 

_Docker takes a conservative approach to cleaning up unused objects (often referred to as _garbage collection), such as images, containers, volumes, and networks: these objects are generally not removed unless you explicitly ask Docker to do so._

**Note:** Refer to the following information for detailed instructions on how to prune unused Docker images: [https://docs.docker.com/config/pruning/](https://docs.docker.com/config/pruning) 


## Nauta Connection Error

Launching a TensorBoard instance and launching a Web UI _does not_ work.
 
After running Nauta to launch the Web UI (nctl launch webui) or the nctl launch tb <experiment_name> commands, a connection error message may be visible. During the usage of these commands, a proxy tunnel to the cluster is created. 

As a result, a connection error can be caused by an incorrect user-config generated by Administrator or by incorrect proxy settings in a local machine. To prevent this, ensure that a valid user-config is used and check the proxy settings. In addition, ensure that the current proxy settings do not block any connection to a local machine.  
 
 ##  Insufficient Resources Causes Experiments Failures 

An experiment fails just after submission, even if the script itself is correct.  

If a Kubernetes cluster does not have enough resources, the pods used in experiments are evicted. This results in failure of the whole experiment, even if there are no other reasons for this failure, such as those caused by users (like lack of access to data, errors in scripts and so on).

It is recommended, therefore that the Administrator investigate the failures to determine a course of action. For example, why have all the resources been consumed; then try to free them.

## Removal of Docker Images

Due to known errors in Docker Garbage Collector making automatic removal of Docker images is laborious and error-prone.

Before running the Docker Garbage Collector, the administrator should remove images that are no longer needed, using the following procedure:

1) Expose the internal Docker registry's API by exposing locally port 5000, exposed by `nauta-docker-registry service_ located` in the nauta namespace. This can be done, for example by issuing the following command on a machine that has access to Nauta:`kubectl port-forward svc/nauta-docker-registry 5000 -n nauta`
     
2) Get a list of images stored in the internal registry by issuing the following command (it is assumed that port 5000 is exposed locally): curl http://localhost:5000/v2/_catalog 
     
 - For more information on Docker Images, refer to: https://docs.docker.com/engine/reference/commandline/image_ls/

3) From the list of images received in the previous step, choose those that should be removed. For each chosen image, execute the following steps:  

      a) Get the list of tags belonging to the chosen image by issuing the following command (it is assumed that port 5000 is exposed locally): `curl http://localhost:5000/v2/<image_name>/tags/list` 
     
      b) For each tag, get a digest related to this tag:  
     `curl --header "Accept: application/vnd.docker.distribution.manifest.v2+json" http://localhost:5000/v2/<image_name>/manifests/<tag>` 
     
     Digest is returned in a header of a response under the _Docker-Content-Digest_ key
      
      c) Remove the image from the registry by issuing the following command:  
     `curl -X "DELETE" --header "Accept: application/vnd.docker.distribution.manifest.v2+json" http://localhost:5000/v2/<image_name>/manifests/<digest>`
     
4) Run Docker Garbage Collector by issuing the following command:

     `kubectl exec -it $(kubectl get --no-headers=true pods -l app=docker-registry -n dls4e -o custom-columns=:metadata.name) -n dls4e registry garbage-collect /etc/docker/registry/config.yml`

5) Restart system's Docker registry. It can be done by deleting the pod with label: `dls4e_app_name=docker-registry` 

## Running Experiments are Evicted After Running Memory-consuming Horovod's Training

When running memory-consuming multi-node, Horovod-based experiments evicts other experiments that work on the same nodes where Horovod-related tasks were scheduled. This is caused by Horovod-related tasks that consume all memory on one master node and worker nodes. This results in eviction of other tasks running on these nodes. However, this is the standard behavior of Kubernetes.

To prevent this, schedule Horovod tasks to be only one on their nodes. To do this, set the requested number of CPUs when submitting an experiment near to maximum allocatable number of CPUs for cluster's nodes.

If the cluster has nodes with different numbers, it should be set to the greatest available number of CPUs on nodes. In this case, review the number of nodes involved in this experiment.

- Number of allocatable CPUs can be gathered by executing the `kubectl` describe node `<node_name>` command. 
- Number of allocatable cpus is displayed in the `Allocatable->cpu` section. 
- Number of CPUs gathered this way should be passed as a: `-p resources.requests.cpu <cpu_number>` parameter while issuing experiment submit.


## Command Connection Error

After running `nctl launch webui` or `nctl launch tb <experiment_name>` command connection error message may display. During this command, a proxy tunnel to the cluster is created. Connection errors can be caused by incorrect user config generated by an Administrator or incorrect proxy settings for local machine. 

To prevent this, ensure that a valid user config is used and check proxy settings. In addition, ensure that current proxy settings _do not_ block any connection to a local machine.  


## Inspecting Draft Logs

While viewing the logs and output from some commands, a user may see the following message:
    
 `Inspect the logs with: draft logs 01CVMD5D3B42E72CB5YQX1ANS5`
    
However, when running the command, the result is that the command _is not_ found (or the logs _are not_ found if there is a separate draft installation). This is because draft is located in NCTL config directory `config` and needs a `--home` parameter. To view the draft logs, use the following command:

`$ ~/config/draft --home ~/config/.draft logs 01CVMD5D3B42E72CB5YQX1ANS5`
    
## Experiment's Pods Stuck in  Terminating State on Node Failure

There may be cases where a node suddenly becomes unavailable, for example due to a power failure. Experiments using TFJob 
templates, which were running on such a node, will stay _Running  in Nauta_ and pods will termintate
indefinitely. Furthermore, an experiment _is not_ rescheduled automatically. 

An example of such occurrence is visible using `kubectl` tool:
```
                    user@ubuntu:~$ kubectl get nodes
NAME                                 STATUS     ROLES    AGE   VERSION
worker0.node.infra.nauta             NotReady   Worker   7d    v1.10.6
worker1.node.infra.nauta             Ready      Worker   7d    v1.10.6
master.node.infra.nauta              Ready      Master   7d    v1.10.6

user@ubuntu:~$ kubectl get pods
NAME                                   READY   STATUS        RESTARTS   AGE
experiment-master-0                    1/1     Terminating   0          45m
tensorboard-service-5f48964d54-tr7xf   2/2     Terminating   0          49m
tensorboard-service-5f48964d54-wsr6q   2/2     Running       0          43m
tiller-deploy-5c7f4fcb69-vz6gp         1/1     Running       0          49m
```

This is related to unresolved issues found in Kubernetes and design of TF-operator. For more information, see links below. 

* https://github.com/kubeflow/tf-operator/issues/720
* https://github.com/kubernetes/kubernetes/issues/55713

To solve this issue, manually resubmit the experiment using nauta.

## A Multinode, Horovod-based Experiment Receives a FAILED Status after a Pod's Failure

If during execution of a multinode, Horovod-based experiment one of pods fails, then the whole experiment gets the FAILED status. Such behavior is caused by a construction of Horovod framework. This framework uses an Open MPI framework to handle multiple tasks instead of using Kubernetes features. Therefore, it _cannot_ rely also on other Kubernetes features such as restarting pods in case of failures. 

This results in training jobs using Horovod _does not_ resurrect failed pods. The Nauta system also _does not_ restart these training jobs. If a user encounters this, they should rerun the experiment manually. The construction of a multinode TFJob-based experiment is different, as it uses Kubernetes features. Thus, training jobs based on TFJobs restart failing pods so an experiment can be continued after their failure without a need to be restarted manually by a user
.

## Nodes Hang When Running Heavy Training Jobs

Running heavy training jobs on workers with the operating system kernel older than 4.* might lead to hanging the worker node. See https://bugzilla.redhat.com/show_bug.cgi?id=1507149 for more information. 

This may occur when a memory limit for 0 job is set to a value close to the maximum amount of memory installed on this node. These problems are caused by errors in handling memory limits in older versions of the kernel. To avoid this problem, it is recommended to install on all nodes of a cluster with a newer version of a system's kernel.

The following kernel was verified as a viable fix for this issue (see link below).

* https://elrepo.org/linux/kernel/el7/x86_64/RPMS/kernel-ml-4.19.2-1.el7.elrepo.x86_64.rpm
      
To install the new kernel refer to: _Chapter 5, Manually Upgrading the Kernel_ in RedHat's Kernel Administration Guide (see link below).

https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/7/html/kernel_administration_guide/ch-manually_upgrading_the_kernel

**Note:** The above kernel _does not_ include RedHat's optimizations and hardware drivers.

## Platform Client for Microsoft Windows

Using standard Microsoft* Windows* terminals (`cmd.exe`, `power shell`) is enough to interact with platform, but there is a sporadic issue with the output. Some lines can be surrounded with incomprehensible characters, for example:

```
[K[?25hCannot connect to K8S cluster: Unable to connect to the server: d...
```
**Note:** The recommended shell environment for Windows operating system is bash. For bash-based terminals, this issue _does not_ occur. 