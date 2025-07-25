# AWS EKS Cluster Setup (Terraform)

This project provisions a **production-grade Amazon EKS cluster** using **Terraform**. The process is broken down into two clear steps:

---

## 🛠 Prerequisites

- Terraform CLI ≥ 1.3
- AWS CLI configured with valid credentials
- AWS IAM user or role with permissions for:
  - VPC and networking
  - EKS and IAM roles

---

## ✅ Step 1: Provision the VPC

The first step is creating a secure and scalable VPC for EKS.

### 🔁 Checkout the VPC tag

```bash
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name
git checkout tags/v1.0.0
```

### 📁 VPC Files

```
.
├── igw.tf             # Internet Gateway
├── locals.tf          # Local variables and AZ logic
├── nat.tf             # NAT Gateway and EIP
├── outputs.tf         # Terraform outputs
├── providers.tf       # AWS provider setup
├── routes.tf          # Route tables and associations
├── subnets.tf         # Public and private subnets
├── terraform.tfstate  # Terraform state file
├── variables.tf       # Input variables
└── vpc.tf             # Main VPC resource
```

### 🚀 Terraform Steps

```bash
terraform init
terraform plan
terraform apply
```

Confirm when prompted. This will provision:
- VPC with `/16` CIDR block
- 2 public and 2 private subnets
- Internet Gateway
- NAT Gateway with Elastic IP
- Public/private route tables

### 📤 Outputs

After apply, Terraform will output:
- VPC ID and CIDR block
- Public and private subnet CIDRs
- NAT Gateway public IP

---

## 💸 Cost Warning

This setup includes a **NAT Gateway**, which costs approximately **$37.96/month** when idle.  
To avoid charges when idle:

```bash
terraform destroy -target=aws_nat_gateway.nat -target=aws_eip.nat
```

---

## 🧹 Cleanup

To destroy all resources from this step:

```bash
terraform destroy
```

---

## 🚀 Step 2: Provision the EKS Cluster

The next step is provisioning the actual EKS cluster using the VPC from Step 1.

### 🔁 Checkout the EKS tag

```bash
git checkout tags/v2.0.0
```

> This tag will include a new `eks.tf` file and any additional resources required to configure your Kubernetes control plane, worker nodes, IAM roles, and node groups.

### 🚀 Terraform Steps for EKS

```bash
terraform init
terraform plan
terraform apply
```

This will:
- Create the EKS cluster in the previously created VPC
- Set up IAM roles, security groups, and node groups
- Output cluster name, endpoint, and authentication data

