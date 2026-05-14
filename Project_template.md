# Задание 1

![C4 Container Diagram](docs/c4-container-diagram.png)

**Примечание:** Events Service в текущей реализации — это MVP для проверки гипотезы интеграции Kafka в архитектуру. Сейчас consumer находится внутри самого сервиса и только логирует полученные события. В целевой архитектуре consumer-ы будут в других сервисах: Монолит будет потреблять payment-events и user-events, Рекомендательная система — movie-events. Пунктирные стрелки на диаграмме отражают это целевое состояние.

# Задание 2

### 1. Proxy

Proxy-сервис реализован на Node.js (Express + http-proxy-middleware) в `src/microservices/proxy/`.

Маршрутизация:
- `GET /health` — возвращает "Strangler Fig Proxy is healthy"
- `/api/events/*` — проксируется в Events Service
- `/api/movies*` — по проценту `MOVIES_MIGRATION_PERCENT` уходит в Movies Service или Monolith
- Остальные пути — проксируются в Monolith

### 2. Kafka

Events-сервис реализован на Node.js (Express + kafkajs) в `src/microservices/events/`.

API:
- `GET /api/events/health` — health check
- `POST /api/events/movie` — публикует событие в топик `movie-events`
- `POST /api/events/user` — публикует событие в топик `user-events`
- `POST /api/events/payment` — публикует событие в топик `payment-events`

Consumer в фоне читает все 3 топика и логирует сообщения.

# Задание 3

### CI/CD

В `docker-build-push.yml` добавлены шаги сборки и пуша для Events Service и Proxy Service. Ветка `cinema` добавлена в триггер.

### Proxy в Kubernetes

- `proxy-service.yaml` — Deployment (порт 8000, health-проба `/health`) + Service (ClusterIP)
- `events-service.yaml` — Deployment (порт 8082, `KAFKA_BROKERS=kafka:9092`, health-проба `/api/events/health`) + Service (ClusterIP)
- `ingress.yaml` — `/api/events` → events-service:8082, `/` → proxy-service:8000
- `configmap.yaml` — добавлен `EVENTS_SERVICE_URL`
- Образы: `ghcr.io/siritoskon/architecture-cinemaabyss/<service>:latest`

#### Скриншоты


# Задание 4

- `values.yaml` — все образы обновлены на `ghcr.io/siritoskon/architecture-cinemaabyss/*`
- `templates/services/proxy-service.yaml` — Deployment + Service по паттерну monolith.yaml
- `templates/services/events-service.yaml` — Deployment + Service по паттерну movies-service.yaml
- `templates/configmap.yaml` — добавлен `EVENTS_SERVICE_URL`, исправлен URL movies-service

#### Скриншоты

