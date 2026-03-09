# TaskTracker Backend - Clean Architecture

Этот проект представляет собой ASP.NET Core Web API, построенный по принципам чистой архитектуры.

## 📁 Структура проекта

```
backend/
├── TaskTracker.Domain/          # Слой Domain - сущности и бизнес-логика
│   ├── Entities/                # Сущности предметной области
│   └── Enums/                   # Перечисления
│
├── TaskTracker.Application/     # Слой Application - бизнес-логика приложения
│   ├── Interfaces/              # Интерфейсы (IRepository, IService)
│   ├── DTOs/                    # Data Transfer Objects
│   │   ├── Requests/            # Request DTO
│   │   └── Responses/           # Response DTO
│   ├── Services/                # Сервисы бизнес-логики
│   └── Mappers/                 # Маппинг Entity <-> DTO
│
├── TaskTracker.Infrastructure/  # Слой Infrastructure - внешние зависимости
│   ├── Persistence/             # База данных (EF Core, DbContext, Migrations)
│   └── ExternalServices/        # Внешние сервисы (OpenAI, Email и т.д.)
│
└── TaskTracker.API/             # Слой Presentation - REST API
    ├── Controllers/             # Контроллеры API
    ├── Program.cs               # Точка входа и конфигурация
    └── appsettings.json         # Конфигурация приложения
```

## 🎯 Принципы чистой архитектуры

- **Domain** - ядро приложения, не зависит ни от чего
- **Application** - зависит только от Domain
- **Infrastructure** - зависит от Domain и Application
- **API** - зависит от всех слоев, точка входа

## 🚀 Как запустить проект

### Предварительные требования

1. **.NET 8.0 SDK** - [Скачать здесь](https://dotnet.microsoft.com/download/dotnet/8.0)
2. **PostgreSQL** (опционально, для работы с БД в будущем)
3. **IDE** - Visual Studio 2022, JetBrains Rider или VS Code

### Проверка установки .NET

```bash
dotnet --version
```

Должна отобразиться версия 8.0.x или выше.

### Шаг 1: Клонирование и переход в директорию

```bash
cd tasky/backend
```

### Шаг 2: Восстановление зависимостей

```bash
dotnet restore
```

### Шаг 3: Сборка проекта

```bash
dotnet build
```

### Шаг 4: Запуск API

Перейдите в папку API проекта:

```bash
cd TaskTracker.API
dotnet run
```

Или запустите из корневой папки backend:

```bash
dotnet run --project TaskTracker.API/TaskTracker.API.csproj
```

### Шаг 5: Открыть Swagger UI

После запуска проект будет доступен по адресам:

- **HTTP:** http://localhost:5000
- **HTTPS:** https://localhost:5001

Swagger UI откроется автоматически на корневом URL:
- http://localhost:5000 (или https://localhost:5001)

## 📡 Тестирование API

### Через Swagger UI

1. Откройте браузер: http://localhost:5000
2. Найдите эндпоинт **GET /api/HelloWorld**
3. Нажмите "Try it out" → "Execute"
4. Получите ответ: `"Hello World"`

### Через cURL

```bash
# Базовый эндпоинт
curl http://localhost:5000/api/HelloWorld

# Персонализированное приветствие
curl http://localhost:5000/api/HelloWorld/Ваше_Имя
```

### Через PowerShell

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/HelloWorld" -Method Get
```

## 🛠️ Полезные команды

### Сборка решения

```bash
dotnet build TaskTracker.sln
```

### Запуск в режиме watch (авто-перезагрузка)

```bash
cd TaskTracker.API
dotnet watch run
```

### Очистка проекта

```bash
dotnet clean
```

### Добавление нового пакета (пример)

```bash
cd TaskTracker.Infrastructure
dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL
```

## 🗄️ Работа с базой данных (для будущего использования)

### Создание миграции

```bash
cd TaskTracker.Infrastructure
dotnet ef migrations add InitialCreate --startup-project ../TaskTracker.API
```

### Применение миграций

```bash
dotnet ef database update --startup-project ../TaskTracker.API
```

## 📝 Конфигурация

Файл `appsettings.json` содержит базовые настройки:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=tasktracker;Username=postgres;Password=postgres"
  }
}
```

Для локальной разработки можно создать `appsettings.Development.json` с вашими настройками (он уже есть в проекте).

## 🔐 Переменные окружения

Для хранения секретов используйте:

1. **User Secrets** (для разработки):
```bash
cd TaskTracker.API
dotnet user-secrets init
dotnet user-secrets set "OpenAI:ApiKey" "ваш-ключ"
```

2. **Environment Variables** (для продакшена)

## 📚 Дополнительные ресурсы

- [ASP.NET Core Documentation](https://docs.microsoft.com/aspnet/core)
- [Entity Framework Core](https://docs.microsoft.com/ef/core)
- [Clean Architecture Guide](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)

## 🎉 Готово!

Теперь у вас есть чистая структура для разработки вашего приложения. Удачи в разработке! 🚀
