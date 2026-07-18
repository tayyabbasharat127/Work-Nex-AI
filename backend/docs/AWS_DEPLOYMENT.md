# AWS backend deployment

## Required services

- ECR repositories for the web, worker, and migration image targets.
- ECS Fargate service for the web API behind an Application Load Balancer.
- Separate ECS RunTask definitions for migrations and scheduled workers.
- RDS PostgreSQL in private subnets with automated backups, Multi-AZ for production, TLS, and a security group limited to ECS tasks.
- S3 bucket with public access blocked, versioning, lifecycle retention, and an ECS task-role policy restricted to the configured prefix.
- Secrets Manager entries for database, JWT, encryption, SMTP, model, Power BI, and integration credentials.
- CloudWatch log groups with retention and alarms.
- EventBridge Scheduler rules for each one-shot worker command.
- ACM certificate, Route 53 record, HTTPS listener, and HTTP-to-HTTPS redirect.

## Deployment order

1. Build immutable images from `Dockerfile` and scan them.
2. Push the image digest to ECR.
3. Run the `migration` target as a one-off ECS task and require exit code zero.
4. Deploy the `runner` target to ECS with rolling health checks on `/health/ready`.
5. Register EventBridge rules against the `worker` target with a task-name command override.
6. Run authenticated smoke tests and inspect CloudWatch errors, latency, and ALB target health.

Do not run migrations from every web replica. Do not mount persistent local volumes for uploads. ECS task roles supply AWS credentials; static AWS keys are not environment variables.

## ECS settings

- Run at least two web tasks across availability zones.
- Set `NODE_ENV=production`, `TRUST_PROXY=1`, `COOKIE_SECURE=true`, and an exact `CORS_ALLOWED_ORIGINS` list.
- Use `STORAGE_DRIVER=s3`, `S3_BUCKET`, `S3_PREFIX`, and `AWS_REGION`.
- Set a 45-second ECS stop timeout; the application stops accepting requests, marks itself unready, drains HTTP, then disconnects Prisma.
- Configure ALB deregistration delay to match the graceful-shutdown window.
- Keep the container filesystem read-only except for the runtime temporary directory if a dependency requires it.

## IAM minimums

The web task role needs only `s3:GetObject`, `s3:PutObject`, and `s3:DeleteObject` for the application prefix plus access to its named secrets. Worker roles should be split where practical. The migration task needs database connectivity and secrets, but no S3 write access unless a migration explicitly requires it.

## Monitoring and rollback

Alarm on ALB 5xx rate, p95 latency, unhealthy hosts, ECS restarts, RDS connections/CPU/storage, failed EventBridge tasks, and structured log events at `error`. Roll back the ECS task definition to the previous image digest. Database migrations in this phase are additive; use a forward corrective migration instead of resetting production data.
