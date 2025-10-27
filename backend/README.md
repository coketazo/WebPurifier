# 수정사항

1. alembic 사용 없이 main에서 `Base.metadata.create_all(bind=engine)` 로 db 테이블 초기화
2. db 실행을 docker compose로 자동화

## Requirements

1. uv
2. docker

## How to build

```bash
git clone https://github.com/coketazo/WebPurifier.git

cd ./backend

docker compose up -d

uv run uvicorn main:app --reload
```

## How to stop

```bash
# Ctrl+C로 uvicorn 종료 후
docker compose down
```

## DB 쉘 여는 법

```bash
docker compose exec db psql -U myuser -d mydatabase
```
