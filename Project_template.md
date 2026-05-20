# Задание 1

![C4 Container Diagram](docs/c4-container-diagram.png)

**Примечание:** Events Service в текущей реализации — это MVP для проверки гипотезы интеграции Kafka в архитектуру. Сейчас consumer находится внутри самого сервиса и только логирует полученные события. В целевой архитектуре consumer-ы будут в других сервисах: Монолит будет потреблять payment-events и user-events, Рекомендательная система — movie-events. Пунктирные стрелки на диаграмме отражают это целевое состояние.

Файлы: [c4-container-diagram.puml](docs/c4-container-diagram.puml)

# Задание 2

### 1. Proxy

Proxy-сервис реализован на Node.js (Express + http-proxy-middleware) в [`src/microservices/proxy/`](src/microservices/proxy/).

Маршрутизация:
- `GET /health` — возвращает "Strangler Fig Proxy is healthy"
- `/api/events/*` — проксируется в Events Service
- `/api/movies*` — по проценту `MOVIES_MIGRATION_PERCENT` уходит в Movies Service или Monolith
- Остальные пути — проксируются в Monolith

Файлы: [index.js](src/microservices/proxy/index.js), [Dockerfile](src/microservices/proxy/Dockerfile), [package.json](src/microservices/proxy/package.json)

### 2. Kafka

Events-сервис реализован на Node.js (Express + kafkajs) в [`src/microservices/events/`](src/microservices/events/).

API:
- `GET /api/events/health` — health check
- `POST /api/events/movie` — публикует событие в топик `movie-events`
- `POST /api/events/user` — публикует событие в топик `user-events`
- `POST /api/events/payment` — публикует событие в топик `payment-events`

Consumer в фоне читает все 3 топика и логирует сообщения.

Файлы: [index.js](src/microservices/events/index.js), [Dockerfile](src/microservices/events/Dockerfile), [package.json](src/microservices/events/package.json)

# Задание 3

### CI/CD

В [`docker-build-push.yml`](.github/workflows/docker-build-push.yml) добавлены шаги сборки и пуша для Events Service и Proxy Service. Ветка `cinema` добавлена в триггер.

### Proxy в Kubernetes

- [`proxy-service.yaml`](src/kubernetes/proxy-service.yaml) — Deployment (порт 8000, health-проба `/health`) + Service (ClusterIP)
- [`events-service.yaml`](src/kubernetes/events-service.yaml) — Deployment (порт 8082, `KAFKA_BROKERS=kafka:9092`, health-проба `/api/events/health`) + Service (ClusterIP)
- [`ingress.yaml`](src/kubernetes/ingress.yaml) — `/api/events` → events-service:8082, `/` → proxy-service:8000
- [`configmap.yaml`](src/kubernetes/configmap.yaml) — добавлен `EVENTS_SERVICE_URL`
- Образы [`monolith.yaml`](src/kubernetes/monolith.yaml), [`movies-service.yaml`](src/kubernetes/movies-service.yaml) — пути обновлены на `ghcr.io/siritoskon/architecture-cinemaabyss/*`

#### Скриншоты

![Pods](docs/k8s-pods.png)
![Services](docs/k8s-services.png)
![Ingress](docs/k8s-ingress.png)
![Postman Tests](docs/postman-tests.png)

# Задание 4

- [`values.yaml`](src/kubernetes/helm/values.yaml) — все образы обновлены на `ghcr.io/siritoskon/architecture-cinemaabyss/*`
- [`proxy-service.yaml`](src/kubernetes/helm/templates/services/proxy-service.yaml) — Deployment + Service по паттерну monolith.yaml
- [`events-service.yaml`](src/kubernetes/helm/templates/services/events-service.yaml) — Deployment + Service по паттерну movies-service.yaml
- [`configmap.yaml`](src/kubernetes/helm/templates/configmap.yaml) — добавлен `EVENTS_SERVICE_URL`, исправлен URL movies-service

#### Скриншоты

![Helm List](docs/helm-list.png)
