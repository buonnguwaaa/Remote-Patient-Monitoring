# Backend Setup Guide

## Prerequisites

Before running the application, ensure you have the following installed:
- Go (1.19 or later)
- Docker and Docker Compose
- Make

## Installation

### Install Dependencies

Navigate to the project directory and install the required Go modules:

```bash
go mod tidy
```

This command will download and organize all necessary dependencies specified in your `go.mod` file.

## Running the Application

### Option 1: Run Full Stack (Server + Worker)

This is the recommended approach for local development. It starts both the Temporal infrastructure and the application components.

```bash
# Start Temporal container
docker compose up -d

# Start both server and worker
make run
```

**What this does:**
- Launches Temporal services in detached mode via Docker
- Starts the backend server
- Initializes the Temporal worker for workflow processing

### Option 2: Run Server Only

If you only need the API server without workflow processing:

```bash
make server
```

**Use case:** When you want to test API endpoints without running background workflows.

### Option 3: Run Worker Only

To run just the Temporal worker for processing workflows:

```bash
# Ensure Temporal is running
docker compose up -d

# Start worker
make worker
```

**Use case:** When you need dedicated worker processes or want to scale workers independently.

## Accessing the Temporal Web UI (Orchestration Flow Debugging)
Temporal provides a web UI for better debugging. After starting Temporal with Docker, you can access the Temporal UI to inspect workflows, tasks, and worker activity:

URL: http://localhost:8233

## Stopping the Application

### Stop Application Components

Press `Ctrl+C` in the terminal where the application is running.

### Stop Docker Services

To stop the Temporal containers:

```bash
docker compose down
```

## Common Commands

| Command | Description |
|---------|-------------|
| `go mod tidy` | Install and clean up dependencies |
| `docker compose up -d` | Start Temporal infrastructure |
| `make run` | Start full application stack |
| `make server` | Start API server only |
| `make worker` | Start Temporal worker only |
| `docker compose down` | Stop all Docker containers |

## Troubleshooting

### Port Conflicts

If you encounter port binding errors, check if services are already running:

```bash
docker ps
lsof -i :8080  # Replace with your server port
```

### Docker Issues

If Docker containers fail to start:

```bash
# View container logs
docker compose logs

# Restart containers
docker compose restart
```

### Dependency Issues

If you encounter module-related errors:

```bash
# Clear module cache
go clean -modcache

# Reinstall dependencies
go mod download
go mod tidy
```

## Project Structure

```
Backend/
├── cmd/           # Application entrypoints
├── internal/      # Business logic 
├── external/      # Third party services
code
├── docker-compose.yml
├── Makefile
└── go.mod
```

## Additional Resources

- [Temporal Documentation](https://docs.temporal.io/)
- [Go Modules Reference](https://go.dev/ref/mod)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

## Support

For issues or questions:
1. Check existing issues in the project repository
2. Review application logs for error messages
3. Consult the team's internal documentation