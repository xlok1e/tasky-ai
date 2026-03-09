## BACK

### 1. Установить:

```bash
dotnet tool install --global dotnet-ef
```

### 2. В директории Tasky.API создать файл appsettings.Development.json. Скопировать туда содержимое файла appsettings.Development.json.example и заполнить там свои данные для БД.

### 3. Для провдение миграций выполнить в директирии backend

Первый шаг

```bash
dotnet ef migrations add InitialCreate --project MainService/Tasky.Infrastructure --startup-project MainService/Tasky.API
```

Второй шаг

```bash
dotnet ef database update --project MainService/Tasky.Infrastructure --startup-project MainService/Tasky.API
```

### 3. Запустить проект

```bash
dotnet run --project MainService/Tasky.API
```

Backend будет доступен по адресу http://localhost:5000.

---

## FRONT

Убидитесь, что на вашем устройстве установлен bun

Для запуска выполнить команды **из директории frontend**

Первый шаг

```bash
bun i
```

Второй шаг

```bash
bun run dev
```
